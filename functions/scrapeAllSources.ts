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

    // Get today's date range for checking existing jobs
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get existing jobs from today
    const existingJobs = await base44.asServiceRole.entities.ScrapeJob.list('-created_date', 1000);
    const todayJobsBySource = new Map();
    existingJobs.forEach(job => {
      const jobDate = new Date(job.created_date);
      if (jobDate >= todayStart && jobDate <= todayEnd) {
        todayJobsBySource.set(job.source_id, job);
      }
    });

    // Create pending jobs only for sources without today's job
    const jobs = [];
    for (const source of activeSources) {
      if (!todayJobsBySource.has(source.id)) {
        const job = await base44.asServiceRole.entities.ScrapeJob.create({
          source_id: source.id,
          source_name: source.name,
          status: 'pending',
          triggered_by: 'bulk'
        });
        jobs.push(job);
      } else {
        jobs.push(todayJobsBySource.get(source.id));
      }
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

      // Get pending jobs
      const pendingJobs = jobs.filter(j => j.status === 'pending');

      // Process 5 jobs every 20 seconds
      for (let i = 0; i < pendingJobs.length; i += 5) {
        const batch = pendingJobs.slice(i, i + 5);

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

        // 20-second delay between batches
        if (i + 5 < pendingJobs.length) {
          await new Promise(resolve => setTimeout(resolve, 20000));
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