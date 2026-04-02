import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Returns analyzed articles for the current user.
// Tries uploaded_by first (explicitly set by analyze functions via asServiceRole),
// then falls back to created_by (auto-set by platform on user-client creates).
// Both fields covered so records are found regardless of which save path ran.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Primary: filter by uploaded_by (explicitly set in newsletterData on every save)
    let items = [];
    try {
      items = await base44.asServiceRole.entities.NewsletterItem.filter(
        { uploaded_by: user.email }, '-date_added_to_app', 200
      );
    } catch (_) {}

    // Fallback: filter by created_by (auto-set by platform on user-client creates)
    if (items.length === 0) {
      try {
        items = await base44.asServiceRole.entities.NewsletterItem.filter(
          { created_by: user.email }, '-date_added_to_app', 200
        );
      } catch (_) {}
    }

    const analyzed = (items || []).filter(
      n => !!n.is_analyzed || n.status === 'completed'
    );

    // Deduplicate by source_url then title
    const seenUrls = new Set();
    const seenTitles = new Set();
    const deduped = analyzed.filter(n => {
      if (n.source_url) {
        if (seenUrls.has(n.source_url)) return false;
        seenUrls.add(n.source_url);
      } else if (n.title) {
        const key = n.title.trim().toLowerCase();
        if (seenTitles.has(key)) return false;
        seenTitles.add(key);
      }
      return true;
    });

    return Response.json({ success: true, items: deduped });

  } catch (error) {
    console.error('getMyNewsletters error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
