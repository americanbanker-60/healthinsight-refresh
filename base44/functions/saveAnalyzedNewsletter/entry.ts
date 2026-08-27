import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CONTENT_FIELDS = [
  'title', 'tldr', 'summary', 'key_takeaways', 'key_statistics',
  'recommended_actions', 'themes', 'ma_activities', 'funding_rounds',
  'key_players', 'sentiment', 'market_sentiment', 'primary_sector',
  'publication_date', 'source_name'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { analysisResult } = await req.json();

    if (!analysisResult || !analysisResult.title) {
      return Response.json({ error: 'Analysis result is required' }, { status: 400 });
    }

    // Check for duplicate by source_url
    if (analysisResult.source_url) {
      const existing = await base44.asServiceRole.entities.NewsletterItem.filter({ source_url: analysisResult.source_url });
      if (existing.length > 0) {
        return Response.json({
          success: true,
          id: existing[0].id,
          title: existing[0].title,
          duplicate: true
        });
      }
    }

    // Build the record field-by-field from the allowed content fields — never
    // spread the client payload (prevents clients from setting uploaded_by,
    // status, is_analyzed, etc.).
    const record = {};
    for (const f of CONTENT_FIELDS) {
      if (analysisResult[f] !== undefined) record[f] = analysisResult[f];
    }
    record.source_url = analysisResult.source_url;
    record.source_type = analysisResult.source_type || (analysisResult.source_url?.startsWith('http') ? 'URL' : 'PDF');
    record.content_type = analysisResult.content_type || (analysisResult.source_url?.startsWith('http') ? 'URL' : 'PDF');
    record.publication_date_confidence = analysisResult.publication_date_confidence;
    record.publication_date_source = analysisResult.publication_date_source;

    // Forced server-side values — never accepted from the client.
    record.uploaded_by = user.email;
    record.is_analyzed = true;
    record.status = 'completed';
    record.processing_status = 'completed';
    record.date_added_to_app = new Date().toISOString();

    const created = await base44.asServiceRole.entities.NewsletterItem.create(record);

    // Link companies and topics in the background
    if (created?.id) {
      base44.asServiceRole.functions.invoke('createNewsletterRelations', {
        newsletter_id: created.id
      }).catch(err => console.error(`Relations error: ${err.message}`));
    }

    return Response.json({
      success: true,
      id: created.id,
      title: created.title
    });

  } catch (error) {
    console.error('Save error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});