import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { deleteNewsletterCascade } from '../../shared/cascadeDelete.ts';

const norm = (s) => (s || '').toString().toLowerCase().trim();
const normUrl = (s) => norm(s).replace(/\/+$/, '');

// One-time admin utility: removes duplicate NewsletterItems (same source_url or
// same composite title+source+date key), keeping only the oldest record per
// duplicate group. Never merges on title alone.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch newsletter items
    const items = await base44.asServiceRole.entities.NewsletterItem.filter({}, 'created_date', 10000);

    const seenUrls = new Map(); // source_url -> first record id
    const seenTitles = new Map(); // composite title key -> first record id
    const toDelete = [];

    for (const item of items) {
      const urlKey = item.source_url ? normUrl(item.source_url) : '';
      const titleKey = [norm(item.title), norm(item.source_name), (item.publication_date || '')].join('|');

      if (urlKey) {
        if (seenUrls.has(urlKey)) {
          toDelete.push(item.id);
        } else {
          seenUrls.set(urlKey, item.id);
        }
      } else if (titleKey && titleKey !== '||') {
        if (seenTitles.has(titleKey)) {
          toDelete.push(item.id);
        } else {
          seenTitles.set(titleKey, item.id);
        }
      }
    }

    let deleted = 0;
    if (toDelete.length > 0) {
      try {
        const res = await deleteNewsletterCascade(base44, toDelete);
        deleted = res.deleted || toDelete.length;
      } catch (e) {
        console.error('cascade delete failed:', e.message);
      }
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