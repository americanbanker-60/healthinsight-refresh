import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Returns analyzed newsletters for the current user.
// Uses base44.entities (user-authenticated client) and filters by created_by,
// which the platform auto-sets on every user-client create — the same mechanism
// that makes SavedSearch.filter({ created_by }) work reliably.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await base44.entities.NewsletterItem.filter(
      { created_by: user.email }, '-date_added_to_app', 200
    );

    const analyzed = (items || []).filter(
      n => !!n.is_analyzed || n.status === 'completed'
    );

    // Deduplicate by source_url (keep most recent per URL), then by title
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
