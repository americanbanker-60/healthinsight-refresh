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

    const { newsletter_id, data } = await req.json();
    if (!newsletter_id || !data) {
      return Response.json({ error: 'Missing newsletter_id or data' }, { status: 400 });
    }

    // Reject any field outside the allowed content set.
    const invalid = Object.keys(data).filter((k) => !CONTENT_FIELDS.includes(k));
    if (invalid.length > 0) {
      return Response.json({ error: `Invalid fields: ${invalid.join(', ')}` }, { status: 400 });
    }

    // Authorization: admin OR the original uploader of this record.
    if (user.role !== 'admin') {
      const existing = await base44.asServiceRole.entities.NewsletterItem.filter({ id: newsletter_id });
      const record = existing[0];
      if (!record || record.uploaded_by !== user.email) {
        return Response.json({ error: 'Forbidden: you can only edit articles you uploaded' }, { status: 403 });
      }
    }

    await base44.asServiceRole.entities.NewsletterItem.update(newsletter_id, data);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});