import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { requireAdmin } from '../../shared/auth.ts';
import { deleteNewsletterCascade } from '../../shared/cascadeDelete.ts';

// Admin-only: cascade-delete a set of NewsletterItems, cleaning up their
// relations, per-user states, custom-pack items, topic alerts, and nulling
// BD-opportunity links. Used by the library bulk-delete action.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try { user = await requireAdmin(base44); }
    catch (e) { return e instanceof Response ? e : Response.json({ error: 'Unauthorized' }, { status: 401 }); }

    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: 'ids (string[]) is required' }, { status: 400 });
    }

    const result = await deleteNewsletterCascade(base44, ids);
    return Response.json({ success: true, deleted: result.deleted });
  } catch (error) {
    console.error('deleteNewsletters error:', error.message);
    return Response.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 });
  }
});