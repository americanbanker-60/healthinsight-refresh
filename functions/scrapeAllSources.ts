import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { mode } = await req.json().catch(() => ({}));

    // Find pending or failed jobs (first 10)
    const pendingJobs = await base44.asServiceRole.entities.ScrapeJob.filter(
      { status: 'pending' },
      '-created_date',
      10
    );
    
    const failedJobs = await base44.asServiceRole.entities.ScrapeJob.filter(
      { status: 'failed' },
      '-created_date',
      10
    );

    const jobsToProcess = [...pendingJobs, ...failedJobs].slice(0, 10);

    if (jobsToProcess.length === 0) {
      return Response.json({
        success: true,
        message: 'No pending or failed jobs to process',
        processed: 0
      });
    }

    // Process the chunk
    const results = [];
    for (const job of jobsToProcess) {
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

        results.push({ success: true, source: job.source_name });
      } catch (error) {
        await base44.asServiceRole.entities.ScrapeJob.update(job.id, {
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message
        });
        results.push({ success: false, source: job.source_name, error: error.message });
      }
    }

    // Check if more jobs exist
    const moreJobs = await base44.asServiceRole.entities.ScrapeJob.filter(
      { status: 'pending' },
      '-created_date',
      1
    );
    
    const moreFailedJobs = await base44.asServiceRole.entities.ScrapeJob.filter(
      { status: 'failed' },
      '-created_date',
      1
    );

    const hasMoreJobs = moreJobs.length > 0 || moreFailedJobs.length > 0;

    return Response.json({
      success: true,
      message: `Processed ${jobsToProcess.length} jobs`,
      processed: jobsToProcess.length,
      has_more: hasMoreJobs,
      results
    });
  } catch (error) {
    console.error('Error in scrapeAllSources:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});