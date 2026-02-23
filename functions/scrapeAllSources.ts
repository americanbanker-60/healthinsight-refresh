import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    console.log(`Starting to scrape ${activeSources.length} sources...`);

    let totalProcessed = 0;
    let totalErrors = 0;
    const errors = [];

    // Scrape each source
    for (const source of activeSources) {
      try {
        console.log(`Scraping ${source.name}...`);
        await base44.asServiceRole.functions.invoke('scrapeSource', { source_id: source.id });
        totalProcessed++;
      } catch (error) {
        console.error(`Failed to scrape ${source.name}:`, error.message);
        errors.push({ source: source.name, error: error.message });
        totalErrors++;
      }
    }

    console.log(`Scrape complete: ${totalProcessed} succeeded, ${totalErrors} failed`);

    return Response.json({
      success: true,
      total_sources: activeSources.length,
      processed: totalProcessed,
      errors: totalErrors,
      error_details: errors
    });
  } catch (error) {
    console.error('Error in scrapeAllSources:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});