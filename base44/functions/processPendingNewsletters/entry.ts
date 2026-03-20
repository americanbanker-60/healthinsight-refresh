import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Leases older than this are considered stale and will be re-queued
const LEASE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const db = base44.asServiceRole.entities.NewsletterItem;
    const now = new Date();

    // ── Step 1: Reset stale leases ───────────────────────────────────
    // Items stuck in 'processing' beyond LEASE_TIMEOUT are reset to 'pending'
    // so another worker can pick them up.
    const staleThreshold = new Date(now.getTime() - LEASE_TIMEOUT_MS).toISOString();
    const staleItems = await db.filter(
      { processing_status: 'processing', processing_started_at: { $lt: staleThreshold } },
      '-created_date',
      50
    );

    let staleReset = 0;
    for (const item of staleItems) {
      await db.update(item.id, {
        processing_status: 'pending',
        processing_started_at: null,
        processing_error: `Stale lease reset at ${now.toISOString()}`
      });
      staleReset++;
    }

    // ── Step 2: Pick up pending items (skip PDFs) ────────────────────
    const pendingItems = await db.filter(
      { processing_status: 'pending' },
      '-created_date',
      20  // batch cap per invocation
    );

    const urlItems = pendingItems.filter(
      n => n.source_type !== 'PDF' && n.content_type !== 'PDF' && n.source_url
    );
    const pdfSkipped = pendingItems.length - urlItems.length;

    if (urlItems.length === 0) {
      return Response.json({
        success: true,
        message: staleReset > 0
          ? `No pending URL items. Reset ${staleReset} stale lease(s).`
          : 'No pending newsletters to process',
        processed: 0,
        failed: 0,
        skipped: pdfSkipped,
        stale_reset: staleReset
      });
    }

    // ── Step 3: Acquire leases ────────────────────────────────────────
    // Mark all picked items as 'processing' before any analysis begins.
    // This prevents other concurrent workers from picking the same items.
    await Promise.all(
      urlItems.map(n =>
        db.update(n.id, {
          processing_status: 'processing',
          processing_started_at: now.toISOString(),
          processing_error: null
        })
      )
    );

    console.log(`Leased ${urlItems.length} items for processing. Stale resets: ${staleReset}`);

    // ── Step 4: Process in batches of 3 ──────────────────────────────
    let processed = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < urlItems.length; i += 3) {
      const batch = urlItems.slice(i, i + 3);

      const batchResults = await Promise.all(
        batch.map(async (newsletter) => {
          try {
            const analysisResult = await base44.asServiceRole.functions.invoke(
              'analyzeNewsletterUrl',
              { url: newsletter.source_url, sourceName: newsletter.source_name || undefined }
            );

            if (!analysisResult?.data?.success) {
              throw new Error(analysisResult?.data?.error || 'analyzeNewsletterUrl returned no success');
            }

            // analyzeNewsletterUrl already creates/updates the record and marks is_analyzed:true.
            // We only need to flip our lease fields.
            await db.update(newsletter.id, {
              processing_status: 'completed',
              processing_completed_at: new Date().toISOString()
            });

            return { id: newsletter.id, status: 'completed' };
          } catch (err) {
            const msg = err?.message || 'Unknown error';
            console.error(`Failed to process ${newsletter.id}:`, msg);

            await db.update(newsletter.id, {
              processing_status: 'failed',
              processing_error: msg,
              processing_completed_at: new Date().toISOString()
            });

            errors.push({ newsletterId: newsletter.id, error: msg });
            return { id: newsletter.id, status: 'failed', error: msg };
          }
        })
      );

      batchResults.forEach(r => {
        if (r.status === 'completed') processed++;
        else failed++;
      });

      // Rate-limit between batches
      if (i + 3 < urlItems.length) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    return Response.json({
      success: true,
      message: `Lease-based processing complete`,
      processed,
      failed,
      skipped: pdfSkipped,
      stale_reset: staleReset,
      errors: errors.slice(0, 10)
    });

  } catch (error) {
    console.error('Error in processPendingNewsletters:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});