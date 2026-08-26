import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { norm, dedupeArr, buildAliasMap, canonicalize } from '../../shared/themeTaxonomy.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const topics = await base44.asServiceRole.entities.Topic.list('-created_date', 1000);
    const canonicalList = topics.map(t => t.topic_name).filter(Boolean);
    if (canonicalList.length === 0) {
      return Response.json({ error: 'No canonical topics exist yet — run canonicalizeThemes first' }, { status: 400 });
    }

    // 1. Gather unmapped distinct labels across articles, ranked by count.
    const all = await base44.asServiceRole.entities.NewsletterItem.list('-created_date', 10000);
    const items = all || [];
    const aliasMap = buildAliasMap(topics);

    const unmappedCounts = {};
    const unmappedDisplay = {};
    for (const n of items) {
      for (const t of (n.themes || [])) {
        const label = (t?.theme || '').toString().trim();
        if (!label) continue;
        if (canonicalize(label, aliasMap)) continue; // already mapped
        const key = norm(label);
        unmappedCounts[key] = (unmappedCounts[key] || 0) + 1;
        if (!unmappedDisplay[key]) unmappedDisplay[key] = label;
      }
    }

    const ranked = Object.entries(unmappedCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, c]) => ({ key: k, label: unmappedDisplay[k], count: c }));

    // Bounded per run: up to 500 labels, split into 250-label LLM calls (each stays under the
    // 120s proxy read timeout). Re-running resumes where the last run left off (classified
    // labels persist as Topic aliases, treated as "already mapped" on the next run).
    const RUN_CAP = 500;
    const LLM_BATCH = 250;
    const multi = ranked.filter(r => r.count >= 2);
    const singles = ranked.filter(r => r.count === 1);
    const toClassify = [...multi, ...singles.slice(0, Math.max(0, RUN_CAP - multi.length))];
    console.log(`Unmapped distinct labels: ${ranked.length}; classifying ${toClassify.length} this run`);

    // 2. Classify in 250-label LLM calls against the existing canonical list.
    const classification = {}; // norm(label) -> canonical
    const canonicalIndex = canonicalList.map((c, i) => `${i + 1}. ${c}`).join('\n');

    for (let i = 0; i < toClassify.length; i += LLM_BATCH) {
      const batch = toClassify.slice(i, i + LLM_BATCH);
      const batchInput = batch.map((r, idx) => `${idx + 1}. ${r.label}`).join('\n');
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `You are classifying healthcare-investment theme labels into a controlled vocabulary.

CANONICAL THEMES (use one of these by its exact name):
${canonicalIndex}

For EACH input label below, assign the single best-fitting canonical theme by its EXACT name from the list above. If a label genuinely fits none, output "UNMAPPED". Be liberal about mapping — prefer the closest canonical theme over UNMAPPED unless the label is truly unrelated to healthcare investment.

Input labels:
${batchInput}

Return JSON: { "assignments": [ { "label": "<original label>", "canonical": "<exact canonical name or UNMAPPED>" } ] }
The assignments array must have exactly ${batch.length} entries, in the same order as the input.`,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              assignments: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    label: { type: 'string' },
                    canonical: { type: 'string' }
                  }
                }
              }
            }
          }
        });
        const assignments = res?.response?.assignments || res?.assignments || [];
        const validCanonicals = new Set(canonicalList.map(c => c.toLowerCase()));
        for (const a of assignments) {
          const c = (a.canonical || '').trim();
          if (c && c.toLowerCase() !== 'unmapped' && validCanonicals.has(c.toLowerCase())) {
            classification[norm(a.label)] = c;
          }
        }
      } catch (e) {
        console.error(`Classification batch ${i} failed:`, e.message);
      }
    }

    console.log(`Classified ${Object.keys(classification).length} labels`);

    // 3. Add the new mappings as aliases (keywords) to their canonical Topics.
    const topicByNorm = new Map();
    topics.forEach(t => topicByNorm.set(norm(t.topic_name), t));
    const newAliasesByTopic = {}; // topicId -> Set of alias strings
    for (const [labelNorm, canonical] of Object.entries(classification)) {
      const t = topicByNorm.get(norm(canonical));
      if (!t) continue;
      if (!newAliasesByTopic[t.id]) newAliasesByTopic[t.id] = new Set(t.keywords || []);
      newAliasesByTopic[t.id].add(labelNorm);
    }
    for (const [topicId, aliasSet] of Object.entries(newAliasesByTopic)) {
      const t = topics.find(x => x.id === topicId);
      const merged = dedupeArr([...(t?.keywords || []), ...aliasSet]);
      try {
        await base44.asServiceRole.entities.Topic.update(topicId, { keywords: merged });
      } catch (e) {
        console.error(`Failed updating topic ${topicId} keywords:`, e.message);
      }
    }

    // 4. Re-rewrite ONLY articles touched by this run's new classifications (resumable).
    const freshTopics = await base44.asServiceRole.entities.Topic.list('-created_date', 1000);
    const freshAliasMap = buildAliasMap(freshTopics);

    // Set of normalized raw labels that gained a mapping this run.
    const newlyMapped = new Set(Object.keys(classification));

    const updates = [];
    for (const n of items) {
      if (!n.themes || n.themes.length === 0) continue;
      const touched = n.themes.some(t => newlyMapped.has(norm(t?.theme || '')));
      if (!touched) continue; // skip articles unaffected by this run
      const mapped = new Map();
      for (const t of n.themes) {
        const rawLabel = (t?.theme || '').toString().trim();
        if (!rawLabel) continue;
        const canonical = canonicalize(rawLabel, freshAliasMap) || rawLabel;
        const key = canonical.toLowerCase().trim();
        if (mapped.has(key)) {
          const existing = mapped.get(key);
          if ((t.description || '').length > existing.length) mapped.set(key, t.description || '');
        } else {
          mapped.set(key, t.description || '');
        }
      }
      const newThemes = [...mapped.entries()].map(([theme, description]) => ({ theme, description }));
      const oldLabels = n.themes.map(t => t.theme).join('|');
      const newLabels = newThemes.map(t => t.theme).join('|');
      if (oldLabels !== newLabels) updates.push({ id: n.id, themes: newThemes });
    }

    let updatedCount = 0;
    for (let i = 0; i < updates.length; i += 500) {
      const chunk = updates.slice(i, i + 500);
      try {
        await base44.asServiceRole.entities.NewsletterItem.bulkUpdate(chunk);
        updatedCount += chunk.length;
      } catch (e) {
        console.error('bulkUpdate chunk failed:', e.message);
      }
    }

    return Response.json({
      success: true,
      labels_classified: Object.keys(classification).length,
      topics_enriched: Object.keys(newAliasesByTopic).length,
      articles_updated: updatedCount,
      remaining_unmapped: ranked.length - toClassify.length,
      alias_map_size: freshAliasMap.size
    });
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 });
  }
});