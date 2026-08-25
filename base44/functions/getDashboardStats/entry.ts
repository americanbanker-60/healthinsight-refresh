import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Returns aggregate NewsletterItem stats (analyzed count, M&A deals, funding
// rounds, unique themes) for the Dashboard's top metric cards.
//
// Why this exists: StatsOverview previously called
// `base44.entities.NewsletterItem.list(..., 10000)` from the browser, which
// shipped thousands of full documents (each with full HTML raw_input) just to
// count fields — that transfer is far too large and fails/times out, leaving
// every card stuck at 0. Computing the aggregates server-side avoids that.
//
// Available to any authenticated app user (read access is already enforced by
// NewsletterItem RLS for admin/power/user roles).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const NEWSLETTER_CAP = 10000;
    let newsletters = [];
    try {
      newsletters = await base44.asServiceRole.entities.NewsletterItem.list('-created_date', NEWSLETTER_CAP);
    } catch (_) {
      try {
        newsletters = await base44.entities.NewsletterItem.list('-created_date', NEWSLETTER_CAP);
      } catch (_) {}
    }

    const list = newsletters || [];
    const articles = list.length;
    const analyzed = list.filter(n =>
      n.is_analyzed || n.summary || n.tldr || (n.key_takeaways && n.key_takeaways.length > 0)
    ).length;
    const ma_deals = list.reduce((sum, n) => sum + (n.ma_activities?.length || 0), 0);
    const funding_rounds = list.reduce((sum, n) => sum + (n.funding_rounds?.length || 0), 0);

    const themesSet = new Set();
    list.forEach(n => {
      if (n.themes) {
        n.themes.forEach(t => {
          if (t.theme) themesSet.add(t.theme);
        });
      }
    });

    return Response.json({
      success: true,
      stats: {
        articles,
        analyzed,
        ma_deals,
        funding_rounds,
        unique_themes: themesSet.size,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}