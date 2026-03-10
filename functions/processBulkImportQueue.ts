import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BATCH_SIZE = 20;
const CONCURRENCY = 4;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Reset jobs stuck in "processing" for > 20 minutes
    const stuckCutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const processingJobs = await base44.asServiceRole.entities.BulkImportJob.filter({ status: 'processing' }, 'created_date', 500);
    const stuckJobs = processingJobs.filter(j => j.updated_date && j.updated_date < stuckCutoff);
    if (stuckJobs.length > 0) {
      console.log(`Resetting ${stuckJobs.length} stuck jobs back to pending`);
      await Promise.all(stuckJobs.map(j => base44.asServiceRole.entities.BulkImportJob.update(j.id, { status: 'pending' })));
    }

    // Get pending jobs
    const pendingJobs = await base44.asServiceRole.entities.BulkImportJob.filter({ status: 'pending' }, 'created_date', BATCH_SIZE);

    if (pendingJobs.length === 0) {
      return Response.json({ success: true, message: 'No pending jobs', processed: 0 });
    }

    console.log(`Processing ${pendingJobs.length} pending jobs`);

    // Mark as processing
    await Promise.all(pendingJobs.map(job =>
      base44.asServiceRole.entities.BulkImportJob.update(job.id, { status: 'processing' })
    ));

    let succeeded = 0, failed = 0, skipped = 0;

    // Process in concurrent chunks
    for (let i = 0; i < pendingJobs.length; i += CONCURRENCY) {
      const chunk = pendingJobs.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(async (job) => {
        try {
          // Check for existing newsletter with this URL
          const existing = await base44.asServiceRole.entities.Newsletter.filter({ source_url: job.url });
          if (existing.length > 0) {
            await base44.asServiceRole.entities.BulkImportJob.update(job.id, {
              status: 'skipped',
              result_title: existing[0].title
            });
            skipped++;
            return;
          }

          // Fetch the URL
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          const htmlResponse = await fetch(job.url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HealthInsightBot/1.0)' }
          });
          clearTimeout(timeoutId);

          if (!htmlResponse.ok) throw new Error(`HTTP ${htmlResponse.status} ${htmlResponse.statusText}`);
          const htmlContent = await htmlResponse.text();

          const urlObj = new URL(job.url);
          const domain = urlObj.hostname.replace('www.', '');

          // Analyze with AI
          const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Analyze this healthcare newsletter/article and extract key information.

URL: ${job.url}
Domain: ${domain}

HTML Content (truncated to first 15000 chars):
${htmlContent.substring(0, 15000)}

Extract:
- title: Clear article title
- source_name: Publication name (use domain "${domain}" as fallback)
- publication_date: Date in YYYY-MM-DD format (estimate from content if not explicit)
- tldr: 2-3 sentence executive summary
- summary: 3-4 paragraph detailed summary
- key_takeaways: 3-5 main points as array
- key_statistics: Array of notable figures with context (can be empty array)
- themes: Major topics covered (can be empty array)
- key_players: Companies/organizations mentioned (can be empty array)
- sentiment: Overall tone (positive/neutral/negative/mixed)
- market_sentiment: Investment market sentiment (bullish/bearish/neutral/mixed)
- deal_value: If M&A transaction, extract total value (e.g. "$500M"), otherwise null
- primary_sector: Primary healthcare sector (Urgent Care, Behavioral Health, Imaging, ASC, Physical Therapy, Dental, Home Health, Anesthesia, MSO, Telehealth, Healthcare IT, Pharmacy, Other)`,
            response_json_schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                source_name: { type: "string" },
                publication_date: { type: "string" },
                tldr: { type: "string" },
                summary: { type: "string" },
                key_takeaways: { type: "array", items: { type: "string" } },
                key_statistics: { type: "array", items: { type: "object", properties: { figure: { type: "string" }, context: { type: "string" } } } },
                themes: { type: "array", items: { type: "object", properties: { theme: { type: "string" }, description: { type: "string" } } } },
                key_players: { type: "array", items: { type: "string" } },
                sentiment: { type: "string" },
                market_sentiment: { type: "string" },
                deal_value: { type: ["string", "null"] },
                primary_sector: { type: "string" }
              }
            }
          });

          const newsletterData = {
            ...result,
            source_url: job.url,
            source_name: job.source_name || result.source_name || domain,
            content_type: 'URL',
            raw_input: htmlContent.substring(0, 50000),
            date_added_to_app: new Date().toISOString(),
            is_analyzed: true,
            publication_date_confidence: "medium",
            publication_date_source: "AI extraction",
            publication_date_notes: "Bulk CSV import"
          };

          const created = await base44.asServiceRole.entities.Newsletter.create(newsletterData);
          const newsletterId = created?.id;

          if (newsletterId) {
            // Create company/topic relations in background
            base44.asServiceRole.functions.invoke('createNewsletterRelations', {
              newsletter_id: newsletterId
            }).catch(err => console.error('Relation creation failed:', err.message));
          }

          await base44.asServiceRole.entities.BulkImportJob.update(job.id, {
            status: 'done',
            result_title: result.title
          });
          succeeded++;
          console.log(`✓ ${result.title}`);

        } catch (err) {
          console.error(`✗ ${job.url}: ${err.message}`);
          await base44.asServiceRole.entities.BulkImportJob.update(job.id, {
            status: 'failed',
            error_message: err.message
          });
          failed++;
        }
      }));
    }

    console.log(`Done: ${succeeded} succeeded, ${failed} failed, ${skipped} skipped`);
    return Response.json({ success: true, processed: pendingJobs.length, succeeded, failed, skipped });

  } catch (error) {
    console.error('Queue processor error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});