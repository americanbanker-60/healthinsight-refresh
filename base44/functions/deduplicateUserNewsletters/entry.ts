import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// One-time admin utility: removes duplicate NewsletterItems per user (same source_url or same title),
// keeping only the oldest record per duplicate group.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all newsletter items
    const items = await base44.asServiceRole.entities.NewsletterItem.filter({}, 'created_date', 2000);

    const seenUrls = new Map(); // source_url -> first record id
    const seenTitles = new Map(); // title_key -> first record id
    const toDelete = [];

    for (const item of items) {
      const urlKey = item.source_url?.trim().toLowerCase();
      const titleKey = item.title?.trim().toLowerCase();

      if (urlKey) {
        if (seenUrls.has(urlKey)) {
          toDelete.push(item.id);
        } else {
          seenUrls.set(urlKey, item.id);
        }
      } else if (titleKey) {
        if (seenTitles.has(titleKey)) {
          toDelete.push(item.id);
        } else {
          seenTitles.set(titleKey, item.id);
        }
      }
    }

    let deleted = 0;
    for (const id of toDelete) {
      await base44.asServiceRole.entities.NewsletterItem.delete(id);
      deleted++;
    }

    return Response.json({
      success: true,
      total_checked: items.length,
      duplicates_deleted: deleted,
      deleted_ids: toDelete,
    });

  } catch (error) {
    console.error('deduplicateUserNewsletters error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});