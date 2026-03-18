import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Process ONE pending job at a time
    const pendingJobs = await base44.asServiceRole.entities.ScrapeJob.filter(
      { status: 'pending' },
      '-created_date',
      1
    );

    if (pendingJobs.length === 0) {
      return Response.json({
        success: true,
        message: 'No pending jobs',
        has_pending: false
      });
    }

    const job = pendingJobs[0];

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

    // Check if more pending jobs exist
    const morePending = await base44.asServiceRole.entities.ScrapeJob.filter(
      { status: 'pending' },
      '-created_date',
      1
    );

    return Response.json({
      success: true,
      has_pending: morePending.length > 0
    });
  } catch (error) {
    console.error('Error in scrapeAllSources:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});