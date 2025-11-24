import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { action, batchSize = 10, startIndex = 0 } = await req.json();

    if (action === 'preserve_dates') {
      // Step 1: Preserve existing created_date as date_added_to_app
      const newsletters = await base44.asServiceRole.entities.Newsletter.list();
      
      let preserved = 0;
      for (const newsletter of newsletters) {
        if (!newsletter.date_added_to_app && newsletter.created_date) {
          await base44.asServiceRole.entities.Newsletter.update(newsletter.id, {
            date_added_to_app: newsletter.created_date
          });
          preserved++;
        }
      }

      return Response.json({
        success: true,
        action: 'preserve_dates',
        preserved,
        total: newsletters.length,
        message: `Preserved ${preserved} created_date values as date_added_to_app`
      });
    }

    if (action === 'extract_batch') {
      // Step 2: Extract publication dates in batches
      const newsletters = await base44.asServiceRole.entities.Newsletter.list();
      const batch = newsletters.slice(startIndex, startIndex + batchSize);
      
      const results = [];
      
      for (const newsletter of batch) {
        if (!newsletter.source_url) {
          results.push({
            id: newsletter.id,
            title: newsletter.title,
            status: 'skipped',
            reason: 'No URL'
          });
          continue;
        }

        // Skip if already has high-confidence publication date
        if (newsletter.publication_date_confidence === 'high') {
          results.push({
            id: newsletter.id,
            title: newsletter.title,
            status: 'skipped',
            reason: 'Already has high-confidence date'
          });
          continue;
        }

        try {
          // Call the extraction function
          const extractResult = await base44.asServiceRole.functions.invoke('extractPublicationDate', {
            url: newsletter.source_url,
            newsletterId: newsletter.id
          });

          results.push({
            id: newsletter.id,
            title: newsletter.title,
            status: extractResult.data.success ? 'success' : 'failed',
            date: extractResult.data.date,
            confidence: extractResult.data.confidence,
            source: extractResult.data.source,
            error: extractResult.data.error
          });
        } catch (error) {
          results.push({
            id: newsletter.id,
            title: newsletter.title,
            status: 'error',
            error: error.message
          });
        }
      }

      const nextIndex = startIndex + batchSize;
      const hasMore = nextIndex < newsletters.length;

      return Response.json({
        success: true,
        action: 'extract_batch',
        batchSize,
        startIndex,
        nextIndex: hasMore ? nextIndex : null,
        hasMore,
        processed: results.length,
        total: newsletters.length,
        results,
        progress: Math.round((nextIndex / newsletters.length) * 100)
      });
    }

    if (action === 'get_stats') {
      const newsletters = await base44.asServiceRole.entities.Newsletter.list();
      
      const stats = {
        total: newsletters.length,
        withPublicationDate: 0,
        withDateAddedToApp: 0,
        confidence: {
          high: 0,
          medium: 0,
          low: 0,
          unknown: 0
        },
        needsExtraction: 0
      };

      for (const newsletter of newsletters) {
        if (newsletter.publication_date) stats.withPublicationDate++;
        if (newsletter.date_added_to_app) stats.withDateAddedToApp++;
        
        if (newsletter.publication_date_confidence) {
          stats.confidence[newsletter.publication_date_confidence]++;
        } else {
          stats.confidence.unknown++;
        }

        if (!newsletter.publication_date || newsletter.publication_date_confidence !== 'high') {
          stats.needsExtraction++;
        }
      }

      return Response.json({
        success: true,
        action: 'get_stats',
        stats
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});