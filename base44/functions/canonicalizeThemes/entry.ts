import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { norm, dedupeArr, buildAliasMap, canonicalize } from '../../shared/themeTaxonomy.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    console.log('Starting theme canonicalization...');

    // 1. Gather all theme labels across articles (with counts + sample descriptions)
    const all = await base44.asServiceRole.entities.NewsletterItem.list('-created_date', 10000);
    const items = all || [];
    console.log(`Loaded ${items.length} articles`);

    const labelCounts = {};
    const labelDescriptions = {};
    items.forEach(n => {
      (n.themes || []).forEach(t => {
        const label = t?.theme?.toString().trim();
        if (!label) return;
        const key = norm(label);
        labelCounts[key] = (labelCounts[key] || 0) + 1;
        if (!labelDescriptions[key]) labelDescriptions[key] = label;
      });
    });

    const ranked = Object.entries(labelCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, c]) => ({ label: labelDescriptions[k], count: c }));

    // Cap the input we send to the LLM: all labels with count>=2, then top singletons.
    const multi = ranked.filter(r => r.count >= 2);
    const singles = ranked.filter(r => r.count === 1);
    const inputLabels = [...multi, ...singles.slice(0, Math.max(0, 2500 - multi.length))];
    console.log(`Distinct labels: ${ranked.length}; sending ${inputLabels.length} to LLM`);

    // 2. Ask the LLM to cluster into a canonical healthcare-PE theme taxonomy.
    const llmInput = inputLabels.map(r => `${r.label} (${r.count})`).join('\n');

    const taxonomyRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a healthcare private-equity taxonomist. Below is a list of free-form theme labels extracted from healthcare investment articles, each with its occurrence count. Consolidate them into a CONTROLLED VOCABULARY of canonical themes.

Goals:
- Produce 50-90 canonical theme labels covering healthcare PE / M&A / investing (sectors, deal structures, market dynamics, regulatory, technology, care models, payor dynamics, etc.).
- Each canonical theme must be a concise, professional Title Case label (e.g., "MSO Platform Build-Up", "Value-Based Care Adoption", "Behavioral Health Consolidation").
- For each canonical theme, list ALL aliases — every input label that should map to it (including acronyms, plurals, casing/punctuation variants, and semantic synonyms). Include the canonical name itself as an alias.
- Cover as many of the provided labels as possible; genuinely novel/specific labels that don't fit any canonical theme can be omitted.
- Avoid overlapping canonical themes (don't create both "VBC Adoption" and "Value-Based Care" — pick one).

Input labels (label | count):
${llmInput}

Return JSON with this exact shape:
{
  "themes": [
    {
      "canonical_name": "Title Case Canonical Name",
      "description": "1 sentence on what this theme covers",
      "icon": "a single emoji",
      "aliases": ["canonical name itself", "variant 1", "variant 2"]
    }
  ]
}`,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          themes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                canonical_name: { type: 'string' },
                description: { type: 'string' },
                icon: { type: 'string' },
                aliases: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    });

    const taxonomy = taxonomyRes?.response?.themes || taxonomyRes?.themes || [];
    if (!Array.isArray(taxonomy) || taxonomy.length === 0) {
      return Response.json({ success: false, error: 'LLM returned no taxonomy' }, { status: 500 });
    }
    console.log(`LLM produced ${taxonomy.length} canonical themes`);

    // 3. Upsert Topics (canonical name = topic_name; aliases = keywords)
    const existingTopics = await base44.asServiceRole.entities.Topic.list('-created_date', 1000);
    const existingByName = new Map();
    existingTopics.forEach(t => existingByName.set(norm(t.topic_name), t));

    let topicsCreated = 0;
    let topicsUpdated = 0;
    for (const ct of taxonomy) {
      const name = (ct.canonical_name || '').trim();
      if (!name) continue;
      const aliases = dedupeArr([name, ...(ct.aliases || [])]);
      const existing = existingByName.get(norm(name));
      if (existing) {
        // Merge aliases into keywords without losing existing keywords.
        const mergedKeywords = dedupeArr([...(existing.keywords || []), ...aliases]);
        try {
          await base44.asServiceRole.entities.Topic.update(existing.id, {
            keywords: mergedKeywords,
            description: ct.description || existing.description,
            icon: ct.icon || existing.icon
          });
          topicsUpdated++;
        } catch (e) {
          console.error(`Failed updating topic ${name}:`, e.message);
        }
      } else {
        try {
          await base44.asServiceRole.entities.Topic.create({
            topic_name: name,
            description: ct.description || '',
            keywords: aliases,
            icon: ct.icon || '🏷️'
          });
          topicsCreated++;
          existingByName.set(norm(name), { topic_name: name, keywords: aliases });
        } catch (e) {
          console.error(`Failed creating topic ${name}:`, e.message);
        }
      }
    }

    // 4. Build the alias map from ALL topics (new + pre-existing) and rewrite articles.
    const finalTopics = await base44.asServiceRole.entities.Topic.list('-created_date', 1000);
    const aliasMap = buildAliasMap(finalTopics);
    console.log(`Alias map size: ${aliasMap.size}`);

    const updates = [];
    let unmapped = 0;
    for (const n of items) {
      if (!n.themes || n.themes.length === 0) continue;
      const mapped = new Map(); // canonical -> description (keep longest description)
      for (const t of n.themes) {
        const rawLabel = t?.theme?.toString().trim();
        if (!rawLabel) continue;
        const canonical = canonicalize(rawLabel, aliasMap);
        if (canonical) {
          const existingDesc = mapped.get(canonical);
          const desc = t.description || '';
          if (!existingDesc || desc.length > existingDesc.length) {
            mapped.set(canonical, desc || existingDesc || '');
          }
        } else {
          // Unmapped label — keep as-is so we don't lose signal.
          unmapped++;
          const key = rawLabel;
          if (!mapped.has(key)) mapped.set(key, t.description || '');
        }
      }
      const newThemes = [...mapped.entries()].map(([theme, description]) => ({ theme, description }));
      // Only queue an update if the labels actually changed.
      const oldLabels = n.themes.map(t => t.theme).join('|');
      const newLabels = newThemes.map(t => t.theme).join('|');
      if (oldLabels !== newLabels) {
        updates.push({ id: n.id, themes: newThemes });
      }
    }

    console.log(`Articles to update: ${updates.length}; unmapped labels kept: ${unmapped}`);

    // 5. Apply in chunks of 500.
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
      canonical_themes: taxonomy.length,
      topics_created: topicsCreated,
      topics_updated: topicsUpdated,
      alias_map_size: aliasMap.size,
      articles_updated: updatedCount,
      unmapped_labels_kept: unmapped,
      message: `Created ${topicsCreated} topics, updated ${topicsUpdated}; rewrote themes on ${updatedCount} articles`
    });
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 });
  }
});