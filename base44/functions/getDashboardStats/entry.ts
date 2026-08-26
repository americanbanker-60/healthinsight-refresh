import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Inlined theme-taxonomy helpers (functions can't import from shared/).
const norm = (s) => (s || '').toString().toLowerCase().trim();
const dedupeArr = (arr) => [...new Set((arr || []).map(norm).filter(Boolean))];
function buildAliasMap(topics) {
  const map = new Map();
  for (const t of (topics || [])) {
    const canonical = (t.topic_name || '').trim();
    if (!canonical) continue;
    for (const a of dedupeArr([canonical, ...(t.keywords || [])])) {
      if (!map.has(a)) map.set(a, canonical);
    }
  }
  return map;
}
function canonicalize(label, aliasMap) {
  const n = norm(label);
  if (!n) return null;
  if (aliasMap.has(n)) return aliasMap.get(n);
  const stripped = n.replace(/[.,;:!?]+$/, '');
  if (aliasMap.has(stripped)) return aliasMap.get(stripped);
  return null;
}

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

    // Normalized theme distribution using the Topic-controlled vocabulary.
    // Build the alias map once, then count every theme instance against it so
    // long-tail aliases roll up to their canonical topic.
    let theme_distribution = [];
    try {
      const topics = await base44.asServiceRole.entities.Topic.list('-sort_order', 1000);
      const aliasMap = buildAliasMap(topics);
      const counts = new Map();
      let mapped = 0;
      let unmapped = 0;
      list.forEach(n => {
        (n.themes || []).forEach(t => {
          const label = t?.theme;
          if (!label) return;
          const canonical = canonicalize(label, aliasMap);
          if (canonical) {
            counts.set(canonical, (counts.get(canonical) || 0) + 1);
            mapped++;
          } else {
            // Keep truly unmapped labels visible too, but normalized for grouping.
            const n2 = norm(label);
            if (n2) {
              counts.set(label, (counts.get(label) || 0) + 1);
              unmapped++;
            }
          }
        });
      });
      theme_distribution = [...counts.entries()]
        .map(([name, value]) => ({ name, value, mapped: aliasMap.has(norm(name)) }))
        .sort((a, b) => b.value - a.value);
    } catch (_) {}

    return Response.json({
      success: true,
      stats: {
        articles,
        analyzed,
        ma_deals,
        funding_rounds,
        unique_themes: themesSet.size,
        theme_distribution,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}