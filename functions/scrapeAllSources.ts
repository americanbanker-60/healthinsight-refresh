import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Helper to process with concurrency limit
async function processConcurrently(items, fn, limit = 3) {
  const results = [];
  const executing = [];
  
  for (const item of items) {
    const promise = Promise.resolve().then(() => fn(item)).then(
      result => {
        executing.splice(executing.indexOf(promise), 1);
        return result;
      }
    );
    
    results.push(promise);
    executing.push(promise);
    
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all active sources
    const sources = await base44.asServiceRole.entities.Source.list('-created_date', 1000);
    const activeSources = sources.filter(s => !s.is_deleted && s.url);

    console.log(`Starting to scrape ${activeSources.length} sources with concurrency limit...`);

    let totalProcessed = 0;
    let totalErrors = 0;

    // Process 3 sources at a time to avoid overwhelming the system
    const results = await processConcurrently(
      activeSources,
      async (source) => {
        try {
          await base44.asServiceRole.functions.invoke('scrapeSource', { source_id: source.id });
          totalProcessed++;
          return { success: true };
        } catch (error) {
          totalErrors++;
          return { success: false, error: error.message };
        }
      },
      3 // Max 3 concurrent requests
    );

    console.log(`Scrape complete: ${totalProcessed} succeeded, ${totalErrors} failed`);

    return Response.json({
      success: true,
      total_sources: activeSources.length,
      processed: totalProcessed,
      errors: totalErrors
    });
  } catch (error) {
    console.error('Error in scrapeAllSources:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});