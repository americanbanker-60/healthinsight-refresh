import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BATCH_SIZE = 20;
const CONCURRENCY = 5;
const DELAY_BETWEEN_JOBS_MS = 500;
const MAX_RETRIES = 3;
const STUCK_CUTOFF_MS = 10 * 60 * 1000; // 10 minutes
const HTML_TRUNCATE_CHARS = 15000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Reset jobs stuck in "processing" using processing_started_at for accuracy
    const stuckCutoff = new Date(Date.now() - STUCK_CUTOFF_MS).toISOString();
    const processingJobs = await base44.asServiceRole.entities.BulkImportJob.filter({ status: 'processing' }, 'created_date', 500);
    const stuckJobs = processingJobs.filter(j => {
      // Use processing_started_at if available, fall back to updated_date
      const startedAt = j.processing_started_at || j.updated_date;
      return startedAt && startedAt < stuckCutoff;
    });

    if (stuckJobs.length > 0) {
      console.log(`Resetting ${stuckJobs.length} stuck jobs back to pending`);
      await Promise.all(stuckJobs.map(j => {
        const retryCount = (j.retry_count || 0) + 1;
        // If already retried too many times, mark perma-failed
        if (retryCount >= MAX_RETRIES) {
          console.log(`Job ${j.id} exceeded max retries (${retryCount}), marking perma-failed`);
          return base44.asServiceRole.entities.BulkImportJob.update(j.id, {
            status: 'perma-failed',
            retry_count: retryCount,
            error_message: `Timed out ${retryCount} times, exceeded max retries`
          });
        }
        return base44.asServiceRole.entities.BulkImportJob.update(j.id, {
          status: 'pending',
          retry_count: retryCount,
          processing_started_at: null
        });
      }));
    }

    // Get pending jobs (exclude perma-failed)
    const pendingJobs = await base44.asServiceRole.entities.BulkImportJob.filter({ status: 'pending' }, 'created_date', BATCH_SIZE);

    if (pendingJobs.length === 0) {
      return Response.json({ success: true, message: 'No pending jobs', processed: 0 });
    }

    console.log(`Processing ${pendingJobs.length} pending jobs`);

    // Mark as processing with timestamp
    const now = new Date().toISOString();
    await Promise.all(pendingJobs.map(job =>
      base44.asServiceRole.entities.BulkImportJob.update(job.id, {
        status: 'processing',
        processing_started_at: now
      })
    ));

    let succeeded = 0, failed = 0, skipped = 0;

    for (let i = 0; i < pendingJobs.length; i += CONCURRENCY) {
      if (i > 0) await sleep(DELAY_BETWEEN_JOBS_MS);
      const chunk = pendingJobs.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(async (job) => {
        try {
          // Check for existing newsletter with this URL
          const existing = await base44.asServiceRole.entities.NewsletterItem.filter({ source_url: job.url });
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

          // Check if URL suggests an archive path (e.g. /2023/11/ or /2019/08/14/)
          const archiveDateMatch = job.url.match(/\/(20\d{2})\/(0[1-9]|1[0-2])\/?(\d{2})?\//);
          const archiveHint = archiveDateMatch
            ? `IMPORTANT: The URL path contains a date segment "/${archiveDateMatch[1]}/${archiveDateMatch[2]}/${archiveDateMatch[3] ? archiveDateMatch[3] + '/' : ''}" — this strongly suggests the article was published around ${archiveDateMatch[1]}-${archiveDateMatch[2]}. Use this as the publication date if no more specific date is found in the content.`
            : `Extract the publication date from the article content if available.`;

          // Analyze with AI
          const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Analyze this healthcare newsletter/article and extract key information.

URL: ${job.url}
Domain: ${domain}

${archiveHint}

HTML Content (truncated to first ${HTML_TRUNCATE_CHARS} chars):
${htmlContent.substring(0, HTML_TRUNCATE_CHARS)}

Extract:
- title: Clear article title
- source_name: Publication name (use domain "${domain}" as fallback)
- publication_date: Date in YYYY-MM-DD format. Check the URL path for date segments (e.g. /2023/11/), article bylines, meta tags, and content context. For archived content, the URL date is authoritative if no explicit date exists in the content.
- tldr: 2-3 sentence executive summary
- summary: 3-4 paragraph detailed summary
- key_takeaways: 3-5 main points as array (always return an array, use [] if none)
- key_statistics: Array of notable figures with context (ALWAYS return as array, use [] if none found)
- ma_activities: Array of M&A deals mentioned (ALWAYS return as array, use [] if none found)
- themes: Major topics covered (always return as array, use [] if none)
- key_players: Companies/organizations mentioned (always return as array, use [] if none)
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
                key_takeaways: { type: "array", items: { type: "string" }, default: [] },
                key_statistics: { type: "array", items: { type: "object", properties: { figure: { type: "string" }, context: { type: "string" } } }, default: [] },
                ma_activities: { type: "array", items: { type: "object", properties: { acquirer: { type: "string" }, target: { type: "string" }, deal_value: { type: "string" }, description: { type: "string" } } }, default: [] },
                themes: { type: "array", items: { type: "object", properties: { theme: { type: "string" }, description: { type: "string" } } }, default: [] },
                key_players: { type: "array", items: { type: "string" }, default: [] },
                sentiment: { type: "string" },
                market_sentiment: { type: "string" },
                deal_value: { type: ["string", "null"] },
                primary_sector: { type: "string" }
              },
              required: ["key_statistics", "ma_activities", "key_takeaways", "themes", "key_players"]
            }
          });

          // IMPORTANT: Do NOT store raw_input (large HTML blob causes create to fail silently)
          const newsletterData = {
            title: result.title || 'Untitled',
            source_url: job.url,
            source_name: job.source_name || result.source_name || domain,
            source_type: 'URL',
            content_type: 'URL',
            publication_date: result.publication_date || null,
            tldr: result.tldr || null,
            summary: result.summary || null,
            key_takeaways: result.key_takeaways || [],
            key_statistics: result.key_statistics || [],
            ma_activities: result.ma_activities || [],
            themes: result.themes || [],
            key_players: result.key_players || [],
            sentiment: result.sentiment || null,
            market_sentiment: result.market_sentiment || null,
            deal_value: result.deal_value || null,
            primary_sector: result.primary_sector || null,
            date_added_to_app: new Date().toISOString(),
            is_analyzed: true,
            publication_date_confidence: "medium",
            publication_date_source: "AI extraction",
            publication_date_notes: "Bulk CSV import"
          };

          console.log(`Creating newsletter: ${newsletterData.title}`);
          const created = await base44.asServiceRole.entities.NewsletterItem.create(newsletterData);

          // CRITICAL: verify the record was actually created
          if (!created || !created.id) {
            throw new Error(`Newsletter.create() returned no ID - record was not saved`);
          }

          console.log(`✓ Created newsletter ID: ${created.id} - ${created.title}`);

          // Create company/topic relations in background
          base44.asServiceRole.functions.invoke('createNewsletterRelations', {
            newsletter_id: created.id
          }).catch(err => console.error('Relation creation failed:', err.message));

          await base44.asServiceRole.entities.BulkImportJob.update(job.id, {
            status: 'done',
            result_title: result.title
          });
          succeeded++;

        } catch (err) {
          console.error(`✗ ${job.url}: ${err.message}`);
          const retryCount = (job.retry_count || 0) + 1;
          const isPermaFailed = retryCount >= MAX_RETRIES;

          await base44.asServiceRole.entities.BulkImportJob.update(job.id, {
            status: isPermaFailed ? 'perma-failed' : 'failed',
            retry_count: retryCount,
            error_message: isPermaFailed
              ? `[PERMA-FAILED after ${retryCount} attempts] ${err.message}`
              : err.message
          });

          if (isPermaFailed) {
            console.log(`Job ${job.id} perma-failed after ${retryCount} attempts`);
          }
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