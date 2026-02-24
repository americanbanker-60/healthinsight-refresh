import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all active sources
    const sources = await base44.asServiceRole.entities.Source.list('-created_date', 1000);
    const activeSources = sources.filter(s => !s.is_deleted && s.url);

    // Create a scrape job for each source
    const jobs = [];
    for (const source of activeSources) {
      const job = await base44.asServiceRole.entities.ScrapeJob.create({
        source_id: source.id,
        source_name: source.name,
        status: 'pending',
        triggered_by: 'bulk'
      });
      jobs.push(job);
    }

    // Start background processing (don't wait for completion)
    setTimeout(async () => {
      // Check if any jobs are already running
      const runningJobs = await base44.asServiceRole.entities.ScrapeJob.filter(
        { status: 'running' },
        '-created_date',
        100
      );

      if (runningJobs.length > 0) {
        console.log(`Skipping: ${runningJobs.length} jobs already running`);
        return;
      }

      // Process 10 jobs at a time
      for (let i = 0; i < jobs.length; i += 10) {
        const batch = jobs.slice(i, i + 10);

        // Process batch in parallel
        await Promise.all(batch.map(async (job) => {
          try {
            // Update to running
            await base44.asServiceRole.entities.ScrapeJob.update(job.id, {
              status: 'running',
              started_at: new Date().toISOString()
            });

            // Scrape the source
            const result = await base44.asServiceRole.functions.invoke('scrapeSource', { 
              source_id: job.source_id 
            });

            // Update with results
            await base44.asServiceRole.entities.ScrapeJob.update(job.id, {
              status: 'completed',
              completed_at: new Date().toISOString(),
              newsletters_found: result.data?.new_count || 0,
              newsletters_created: result.data?.new_count || 0,
              metadata: {
                companies_created: result.data?.companies_created || [],
                topics_matched: result.data?.topic_assignments?.length || 0
              }
            });
          } catch (error) {
            await base44.asServiceRole.entities.ScrapeJob.update(job.id, {
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: error.message
            });
          }
        }));

        // 3-second delay between batches
        if (i + 10 < jobs.length) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }, 0);

    return Response.json({
      success: true,
      message: `Started scraping ${activeSources.length} sources in background`,
      total_sources: activeSources.length,
      jobs_created: jobs.length
    });
  } catch (error) {
    console.error('Error in scrapeAllSources:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});