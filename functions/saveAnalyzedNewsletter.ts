import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

    // Save with all required flags so it shows up in the dashboard
    const record = await base44.asServiceRole.entities.NewsletterItem.create({
      ...analysisResult,
      is_analyzed: true,
      status: 'completed',
      date_added_to_app: new Date().toISOString(),
      source_type: analysisResult.source_type || (analysisResult.source_url?.startsWith('http') ? 'URL' : 'PDF'),
      content_type: analysisResult.content_type || (analysisResult.source_url?.startsWith('http') ? 'URL' : 'PDF'),
    });

    console.log(`Saved newsletter: ${record.id} - ${analysisResult.title}`);

    // Link companies and topics in the background
    if (record?.id) {
      base44.asServiceRole.functions.invoke('createNewsletterRelations', {
        newsletter_id: record.id
      }).catch(err => console.error(`Relations error: ${err.message}`));
    }

    return Response.json({
      success: true,
      id: record.id,
      title: record.title
    });

  } catch (error) {
    console.error('Save error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});