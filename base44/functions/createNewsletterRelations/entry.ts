import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Cursor-paginated fetch up to `limit` records (pages of 1000) using created_date,
// so Company/Topic matching works even if a single list() call is capped lower.
async function fetchAll(base44, entity, limit) {
  const out = [];
  let cursor = null;
  while (out.length < limit) {
    const query = cursor ? { created_date: { $lt: cursor } } : {};
    const batch = await base44.asServiceRole.entities[entity].filter(query, '-created_date', 1000);
    if (!batch || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < 1000) break;
    cursor = batch[batch.length - 1].created_date;
    if (!cursor) break;
  }
  return out.slice(0, limit);
}

function escapeRegex(s) {
  return (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Word-boundary, case-insensitive matcher. Returns null for empty/match-all.
function buildMatcher(term) {
  const escaped = escapeRegex((term || '').toString().toLowerCase().trim());
  if (!escaped) return null;
  try { return new RegExp('\\b' + escaped + '\\b', 'i'); } catch (_) { return null; }
}

// Normalize a key_players entry (legacy string or typed object) to { name, type }.
function normalizeKeyPlayer(p) {
  if (!p) return null;
  if (typeof p === 'string') return { name: p, type: 'company' };
  if (p && typeof p === 'object') {
    const type = ['company', 'pe_firm', 'payor', 'health_system', 'person'].includes(p.type) ? p.type : 'company';
    return { name: p.name || '', type };
  }
  return null;
}

const NON_PERSON_TYPES = new Set(['company', 'pe_firm', 'payor', 'health_system']);

// Resolve watcher emails and create TopicAlert rows for each matched topic.
// created_by is forced to the watcher's email so RLS (created_by == user.email)
// lets the watcher see their own alert. Best-effort: skips silently on failure.
async function createTopicAlerts(base44, newsletter_id, topicIds) {
  if (!topicIds || topicIds.length === 0) return;

  let existingAlerts = [];
  try { existingAlerts = await base44.asServiceRole.entities.TopicAlert.filter({ item_id: newsletter_id }); }
  catch (_) {}
  const existingKeys = new Set(existingAlerts.map((a) => `${a.topic_id}|${a.created_by || a.created_by_id || ''}`));

  let userMap = null;
  const getUserEmail = async (watcher) => {
    const cb = watcher.created_by;
    if (cb && cb.includes('@')) return cb;
    if (!userMap) {
      try {
        const users = await base44.asServiceRole.entities.User.list();
        userMap = new Map(users.map((u) => [u.id, u.email]));
      } catch (_) { userMap = new Map(); }
    }
    return userMap.get(watcher.created_by_id) || null;
  };

  for (const topicId of topicIds) {
    let watchers = [];
    try { watchers = await base44.asServiceRole.entities.WatchedTopic.filter({ topic_id: topicId }); }
    catch (_) { continue; }
    for (const watcher of watchers) {
      let email = null;
      try { email = await getUserEmail(watcher); } catch (_) {}
      if (!email) continue;
      const key = `${topicId}|${email}`;
      if (existingKeys.has(key)) continue;
      try {
        await base44.asServiceRole.entities.TopicAlert.create({
          topic_id: topicId, item_id: newsletter_id, is_read: false, created_by: email
        });
        existingKeys.add(key);
      } catch (_) {}
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { newsletter_id, newsletter_data } = await req.json();
    if (!newsletter_id) {
      return Response.json({ error: 'newsletter_id required' }, { status: 400 });
    }

    // Try DB lookup first; fall back to inline data (handles prod-env IDs not visible via asServiceRole)
    let newsletter = null;
    try {
      const newsletters = await base44.asServiceRole.entities.NewsletterItem.filter({ id: newsletter_id });
      newsletter = newsletters[0] || null;
    } catch (_) {}
    if (!newsletter && newsletter_data) newsletter = newsletter_data;
    if (!newsletter) {
      return Response.json({ error: 'Newsletter not found and no inline data provided' }, { status: 404 });
    }

    // Fetch all companies and topics (paginated, up to 5000 each)
    const [companies, topics] = await Promise.all([
      fetchAll(base44, 'Company', 5000),
      fetchAll(base44, 'Topic', 5000),
    ]);

    // Normalize key_players defensively (legacy strings -> typed objects)
    const keyPlayers = (newsletter.key_players || []).map(normalizeKeyPlayer).filter(Boolean);

    // Auto-create Company rows ONLY for non-person key_players not already present.
    // Skip 'person' type and names shorter than 4 characters (persons never become Companies).
    const existingCompanyNames = new Set(
      companies.map((c) => (c.company_name || '').toString().toLowerCase().trim()).filter(Boolean)
    );
    const newCompanies = [];
    for (const kp of keyPlayers) {
      const name = (kp.name || '').trim();
      const lower = name.toLowerCase();
      if (!name || name.length < 4) continue;
      if (!NON_PERSON_TYPES.has(kp.type)) continue;
      if (existingCompanyNames.has(lower)) continue;
      try {
        const created = await base44.asServiceRole.entities.Company.create({
          company_name: name,
          description: `Identified in: ${(newsletter.title || '').slice(0, 150)}`
        });
        if (created?.id) { newCompanies.push(created); existingCompanyNames.add(lower); }
      } catch (_) {}
    }
    const allCompanies = [...companies, ...newCompanies];

    // Build searchable text from newsletter (key_players joined by .name)
    const searchText = [
      newsletter.title || '',
      newsletter.summary || '',
      newsletter.tldr || '',
      ...(newsletter.key_takeaways || []),
      ...keyPlayers.map((k) => k.name),
      ...(newsletter.ma_activities?.flatMap((ma) => [ma.acquirer, ma.target]) || []),
      ...(newsletter.funding_rounds?.map((f) => f.company) || []),
      ...(newsletter.themes?.map((t) => `${t.theme} ${t.description}`) || [])
    ].join(' ').toLowerCase();

    const relations = [];

    // Match companies with word-boundary regex; skip names < 4 chars unless in known_aliases.
    for (const company of allCompanies) {
      let relevanceScore = 0;
      let matchType = null;

      const aliasSet = new Set(
        (company.known_aliases || []).map((a) => (a || '').toString().toLowerCase().trim()).filter(Boolean)
      );
      const termAllowed = (term) => {
        const t = (term || '').toString().toLowerCase().trim();
        if (!t) return false;
        if (t.length < 4) return aliasSet.has(t);
        return true;
      };

      if (termAllowed(company.company_name)) {
        const m = buildMatcher(company.company_name);
        if (m && m.test(searchText)) { relevanceScore = 10; matchType = 'exact'; }
      }

      if (company.known_aliases && Array.isArray(company.known_aliases)) {
        for (const alias of company.known_aliases) {
          if (!termAllowed(alias)) continue;
          const m = buildMatcher(alias);
          if (m && m.test(searchText) && relevanceScore < 9) { relevanceScore = 9; matchType = matchType || 'alias'; }
        }
      }

      if (company.primary_keywords && Array.isArray(company.primary_keywords)) {
        for (const keyword of company.primary_keywords) {
          if (!termAllowed(keyword)) continue;
          const m = buildMatcher(keyword);
          if (m && m.test(searchText) && relevanceScore < 7) { relevanceScore = 7; matchType = matchType || 'keyword'; }
        }
      }

      if (relevanceScore > 0) {
        relations.push({
          newsletter_id, entity_type: 'company', entity_id: company.id,
          entity_name: company.company_name, relevance_score: relevanceScore, match_type: matchType
        });
      }
    }

    // Match topics (word-boundary regex; skip keywords < 4 chars)
    const matchedTopicIds = [];
    for (const topic of topics) {
      let relevanceScore = 0;
      let matchType = null;

      const topicKeywords = Array.isArray(topic.keywords) ? topic.keywords : (topic.keywords ? [topic.keywords] : []);
      for (const keyword of topicKeywords) {
        const k = (keyword || '').toString().toLowerCase().trim();
        if (!k || k.length < 4) continue;
        const m = buildMatcher(k);
        if (m && m.test(searchText) && relevanceScore < 8) { relevanceScore = 8; matchType = 'keyword'; }
      }

      if (newsletter.themes && Array.isArray(newsletter.themes)) {
        for (const theme of newsletter.themes) {
          if (theme?.theme && theme.theme.toLowerCase() === (topic.topic_name || '').toLowerCase()) {
            relevanceScore = 10; matchType = 'theme';
          }
        }
      }

      if (relevanceScore > 0) {
        relations.push({
          newsletter_id, entity_type: 'topic', entity_id: topic.id,
          entity_name: topic.topic_name, relevance_score: relevanceScore, match_type: matchType
        });
        matchedTopicIds.push(topic.id);
      }
    }

    // Delete existing relations for this newsletter, then bulk-create the new set.
    const existingRelations = await base44.asServiceRole.entities.NewsletterRelation.filter({ newsletter_id });
    for (const rel of existingRelations) {
      await base44.asServiceRole.entities.NewsletterRelation.delete(rel.id);
    }
    if (relations.length > 0) {
      await base44.asServiceRole.entities.NewsletterRelation.bulkCreate(relations);
    }

    // Topic alerts for watchers (best-effort, created_by forced to watcher email)
    await createTopicAlerts(base44, newsletter_id, matchedTopicIds);

    // Best-effort: mark newsletter completed in asServiceRole env (no-op for prod-env IDs)
    try {
      await base44.asServiceRole.entities.NewsletterItem.update(newsletter_id, {
        status: 'completed',
        is_analyzed: true
      });
    } catch (_) {}

    return Response.json({
      success: true,
      relations_created: relations.length,
      companies: relations.filter(r => r.entity_type === 'company').length,
      topics: relations.filter(r => r.entity_type === 'topic').length
    });

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({
      success: false,
      error: error.message || 'Unknown error occurred'
    }, { status: 500 });
  }
});