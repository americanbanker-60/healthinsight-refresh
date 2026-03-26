import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all newsletters in batches
    const all = await base44.asServiceRole.entities.NewsletterItem.list('-created_date', 10000);

    // Mark any newsletter with real content as analyzed
    const toFix = all.filter(n =>
      !n.is_analyzed && (n.summary || n.tldr || (n.key_takeaways && n.key_takeaways.length > 0))
    );

    let fixed = 0;
    // Update in parallel batches of 20
    const batchSize = 20;
    for (let i = 0; i < toFix.length; i += batchSize) {
      const batch = toFix.slice(i, i + batchSize);
      await Promise.all(
        batch.map(n => base44.asServiceRole.entities.NewsletterItem.update(n.id, { is_analyzed: true }))
      );
      fixed += batch.length;
    }

    return Response.json({
      success: true,
      total_newsletters: all.length,
      already_flagged: all.filter(n => n.is_analyzed).length,
      newly_fixed: fixed,
      no_content: all.length - all.filter(n => n.is_analyzed || n.summary || n.tldr).length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});