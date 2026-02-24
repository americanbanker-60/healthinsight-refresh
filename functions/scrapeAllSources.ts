import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Chunked worker function
async function processChunk(base44, jobs, chunkIndex) {
  const CHUNK_SIZE = 10;
  const DELAY_BETWEEN_SCRAPES = 2000; // 2 seconds
  const chunk = jobs.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE);
  
  console.log(`Processing chunk ${chunkIndex + 1}: ${chunk.length} jobs`);
  
  for (const job of chunk) {
    try {
      await base44.asServiceRole.entities.ScrapeJob.update(job.id, {
        status: 'running',
        started_at: new Date().toISOString()
      });

      const result = await base44.asServiceRole.functions.invoke('scrapeSource', { 
        source_id: job.source_id 
      });

      await base44.asServiceRole.entities.ScrapeJob.update(job.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        newsletters_found: result.data?.new_count || 0,
        newsletters_created: result.data?.new_count || 0,
        metadata: result.data || {}
      });
    } catch (error) {
      await base44.asServiceRole.entities.ScrapeJob.update(job.id, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error.message
      });
    }

    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_SCRAPES));
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { resume } = await req.json().catch(() => ({}));

    let jobs = [];
    
    if (resume) {
      // Resume: get pending/failed jobs
      const existingJobs = await base44.asServiceRole.entities.ScrapeJob.list('-created_date', 2000);
      jobs = existingJobs.filter(j => j.status === 'pending' || j.status === 'failed');
      console.log(`Resuming ${jobs.length} pending/failed jobs`);
    } else {
      // Fresh start: create jobs for all active sources
      const sources = await base44.asServiceRole.entities.Source.list('-created_date', 1000);
      const activeSources = sources.filter(s => !s.is_deleted && s.url);

      // Check which sources already have jobs
      const existingJobs = await base44.asServiceRole.entities.ScrapeJob.list('-created_date', 2000);
      const existingSourceIds = new Set(existingJobs.map(j => j.source_id));

      for (const source of activeSources) {
        if (!existingSourceIds.has(source.id)) {
          const job = await base44.asServiceRole.entities.ScrapeJob.create({
            source_id: source.id,
            source_name: source.name,
            status: 'pending',
            triggered_by: 'bulk'
          });
          jobs.push(job);
        }
      }
    }

    if (jobs.length === 0) {
      return Response.json({
        success: true,
        message: 'No jobs to process',
        total_jobs: 0
      });
    }

    const trackingId = crypto.randomUUID();
    console.log(`Starting bulk scrape ${trackingId}: ${jobs.length} jobs`);

    // Process chunks in background
    setTimeout(async () => {
      const CHUNK_SIZE = 10;
      const COOLDOWN_BETWEEN_CHUNKS = 30000; // 30 seconds
      const totalChunks = Math.ceil(jobs.length / CHUNK_SIZE);
      
      for (let i = 0; i < totalChunks; i++) {
        await processChunk(base44, jobs, i);
        
        if (i < totalChunks - 1) {
          console.log(`Cooldown before chunk ${i + 2}...`);
          await new Promise(resolve => setTimeout(resolve, COOLDOWN_BETWEEN_CHUNKS));
        }
      }
      
      console.log(`Bulk scrape ${trackingId} complete`);
    }, 0);

    return Response.json({
      success: true,
      tracking_id: trackingId,
      message: `Processing ${jobs.length} sources in chunks of 10`,
      total_jobs: jobs.length,
      estimated_time_minutes: Math.ceil((jobs.length * 2 + (Math.ceil(jobs.length / 10) - 1) * 30) / 60)
    });
  } catch (error) {
    console.error('Error in scrapeAllSources:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});