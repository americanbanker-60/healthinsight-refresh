import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildAliasMap, canonicalize } from '../../shared/themeTaxonomy.ts';

// Returns slim article preview snippets grouped by canonical theme, used by
// the Dashboard ThemeDistribution chart's hover tooltip. Fetching full
// NewsletterItem docs in the browser just for a tooltip is too heavy (raw_input
// HTML), so this runs server-side and returns only the fields the tooltip needs.
//
// "Top-rated" = starred articles first, then most recent.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let newsletters = [];
    try {
      newsletters = await base44.asServiceRole.entities.NewsletterItem.list('-created_date', 10000);
    } catch (_) {
      try { newsletters = await base44.entities.NewsletterItem.list('-created_date', 10000); } catch (_) {}
    }
    const list = (newsletters || []).filter(n => n.is_analyzed || n.tldr || n.summary);

    let aliasMap = new Map();
    try {
      const topics = await base44.asServiceRole.entities.Topic.list('-sort_order', 1000);
      aliasMap = buildAliasMap(topics);
    } catch (_) {}

    const buckets = new Map();
    const push = (theme, n) => {
      if (!theme) return;
      const arr = buckets.get(theme) || [];
      arr.push({
        id: n.id,
        title: n.title || '',
        tldr: n.tldr || (n.summary ? (n.summary || '').slice(0, 180) : ''),
        is_starred: !!n.is_starred,
        source_name: n.source_name || '',
        publication_date: n.publication_date || n.date_added_to_app || '',
      });
      buckets.set(theme, arr);
    };

    list.forEach(n => {
      (n.themes || []).forEach(t => {
        const label = t?.theme;
        if (!label) return;
        const canonical = canonicalize(label, aliasMap) || label;
        push(canonical, n);
      });
    });

    const snippets = {};
    for (const [theme, arr] of buckets.entries()) {
      arr.sort((a, b) =>
        (Number(!!b.is_starred) - Number(!!a.is_starred)) ||
        (new Date(b.publication_date || 0) - new Date(a.publication_date || 0))
      );
      snippets[theme] = arr.slice(0, 3);
    }

    return Response.json({ success: true, snippets });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}