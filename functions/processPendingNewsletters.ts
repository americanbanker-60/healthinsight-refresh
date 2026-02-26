import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can run this background job
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get unanalyzed newsletters in smaller batches to prevent timeouts
    const unanalyzedNewsletters = await base44.asServiceRole.entities.Newsletter.filter(
      { is_analyzed: { $ne: true } },
      '-created_date',
      50
    );

    if (unanalyzedNewsletters.length === 0) {
      return Response.json({
        success: true,
        message: 'No pending newsletters to process',
        processed: 0,
        skipped: 0
      });
    }

    let processed = 0;
    let skipped = 0;
    const errors = [];

    // Process in batches of 3 to reduce load
    for (let i = 0; i < unanalyzedNewsletters.length; i += 3) {
      const batch = Array.from(unanalyzedNewsletters.slice(i, i + 3));

      // Process batch in parallel
      const batchPromises = batch.map(async (newsletter) => {
        try {
          // Only process URL-based newsletters (skip PDFs)
          if (newsletter.source_type === 'PDF' || newsletter.content_type === 'PDF') {
            return { id: newsletter.id, status: 'skipped', reason: 'PDF source' };
          }

          // Invoke the existing analysis function
          const analysisResult = await base44.asServiceRole.functions.invoke('analyzeNewsletterUrl', {
            url: newsletter.source_url,
            sourceName: newsletter.source_name || 'Unknown Source'
          });

          // Extract analyzed data
          const analyzedData = analysisResult.data;

          if (!analyzedData) {
            throw new Error('No analysis data returned');
          }

          // Update newsletter with analysis results
          await base44.asServiceRole.entities.Newsletter.update(newsletter.id, {
            summary: analyzedData.summary || newsletter.summary,
            tldr: analyzedData.tldr || newsletter.tldr,
            key_takeaways: analyzedData.key_takeaways || newsletter.key_takeaways,
            key_players: analyzedData.key_players || newsletter.key_players,
            key_statistics: analyzedData.key_statistics || newsletter.key_statistics,
            themes: analyzedData.themes || newsletter.themes,
            ma_activities: analyzedData.ma_activities || newsletter.ma_activities,
            funding_rounds: analyzedData.funding_rounds || newsletter.funding_rounds,
            sentiment: analyzedData.sentiment || newsletter.sentiment,
            market_sentiment: analyzedData.market_sentiment || newsletter.market_sentiment,
            primary_sector: analyzedData.primary_sector || newsletter.primary_sector,
            is_analyzed: true
          });

          return { id: newsletter.id, status: 'processed' };
        } catch (error) {
          errors.push({
            newsletterId: newsletter.id,
            error: error.message
          });
          return { id: newsletter.id, status: 'failed', error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Count results
      batchResults.forEach(result => {
        if (result.status === 'processed') {
          processed++;
        } else if (result.status === 'skipped' || result.status === 'already_analyzed') {
          skipped++;
        }
      });

      // Rate limiting: wait 3 seconds between batches to prevent overwhelming LLM
      if (i + 3 < unanalyzedNewsletters.length) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    return Response.json({
      success: true,
      message: `Background processing complete`,
      processed,
      skipped,
      failed: errors.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : [] // Return first 10 errors
    });
  } catch (error) {
    console.error('Error in processPendingNewsletters:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});