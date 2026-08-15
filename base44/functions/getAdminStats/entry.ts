import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Returns NewsletterItem totals (articles + analyzed) for the Admin Dashboard so
// the browser doesn't have to fetch thousands of full documents just to compute counts.
// Admin-only — verifies the caller's role before returning anything.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // The entity API exposes no count primitive, so we bound a single list and count
    // in memory server-side instead of shipping full documents to the client.
    const NEWSLETTER_CAP = 10000;
    let newsletters = [];
    try {
      newsletters = await base44.asServiceRole.entities.NewsletterItem.list('-created_date', NEWSLETTER_CAP);
    } catch (_) {
      try {
        newsletters = await base44.entities.NewsletterItem.list('-created_date', NEWSLETTER_CAP);
      } catch (_) {}
    }
    const articles = (newsletters || []).length;
    const analyzed = (newsletters || []).filter(n => n.is_analyzed).length;

    return Response.json({ success: true, stats: { articles, analyzed } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}