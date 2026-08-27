import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { deleteNewsletterCascade } from '../../shared/cascadeDelete.ts';

const norm = (s) => (s || '').toString().toLowerCase().trim();
const normUrl = (s) => norm(s).replace(/\/+$/, '');
const maKey = (m) => [norm(m.acquirer), norm(m.target)].filter(Boolean).join('|');
const fundKey = (f) => [norm(f.company), norm(f.round_type), norm(f.amount)].filter(Boolean).join('|');
const playerName = (p) => norm(typeof p === 'string' ? p : p?.name);
// Coerce a legacy string key_players entry to a typed object; pass objects through.
const normalizeKeyPlayer = (p) => typeof p === 'string' ? { name: p, type: 'company' } : p;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    console.log('Starting newsletter deduplication (batched)...');

    const allNewsletters = await base44.asServiceRole.entities.NewsletterItem.filter({}, '-created_date', 10000);
    console.log(`Found ${allNewsletters?.length ?? 'null'} newsletters to check`);

    const urlMap = new Map();
    const titleMap = new Map();

    allNewsletters.forEach(newsletter => {
      if (newsletter.source_url) {
        const u = normUrl(newsletter.source_url);
        if (u) {
          if (!urlMap.has(u)) urlMap.set(u, []);
          urlMap.get(u).push(newsletter);
        }
      }
      // Composite title key — NEVER merge on title alone.
      if (newsletter.title) {
        const t = [norm(newsletter.title), norm(newsletter.source_name), (newsletter.publication_date || '')].join('|');
        if (t && t !== '||') {
          if (!titleMap.has(t)) titleMap.set(t, []);
          titleMap.get(t).push(newsletter);
        }
      }
    });

    const duplicateGroups = [];
    for (const [url, newsletters] of urlMap) {
      if (newsletters.length > 1) duplicateGroups.push({ type: 'url', key: url, newsletters });
    }
    for (const [titleKey, newsletters] of titleMap) {
      if (newsletters.length > 1) {
        const ids = newsletters.map(n => n.id);
        const alreadyGrouped = duplicateGroups.some(group =>
          group.newsletters.some(n => ids.includes(n.id))
        );
        if (!alreadyGrouped) duplicateGroups.push({ type: 'title', key: titleKey, newsletters });
      }
    }

    console.log(`Found ${duplicateGroups.length} duplicate groups — building batch updates`);

    const updates = [];
    const dupIds = [];

    for (const group of duplicateGroups) {
      try {
        const sorted = group.newsletters.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        const primary = sorted[0];
        const duplicates = sorted.slice(1);

        const allThemes = [...(primary.themes || [])];
        const themeKeys = new Set(allThemes.map(t => norm(t.theme)));
        duplicates.forEach(dup => {
          (dup.themes || []).forEach(theme => {
            if (theme.theme && !themeKeys.has(norm(theme.theme))) {
              allThemes.push(theme);
              themeKeys.add(norm(theme.theme));
            }
          });
        });

        const allTakeaways = [...(primary.key_takeaways || [])];
        const takeawaySet = new Set(allTakeaways.map(t => norm(t)));
        duplicates.forEach(dup => {
          (dup.key_takeaways || []).forEach(takeaway => {
            if (takeaway && !takeawaySet.has(norm(takeaway))) {
              allTakeaways.push(takeaway);
              takeawaySet.add(norm(takeaway));
            }
          });
        });

        // key_players are typed objects — dedup by normalized name, preserve type.
        const allPlayers = [...(primary.key_players || [])].map(normalizeKeyPlayer);
        const playerSet = new Set(allPlayers.map(playerName));
        duplicates.forEach(dup => {
          (dup.key_players || []).forEach(player => {
            const np = normalizeKeyPlayer(player);
            if (np && np.name && !playerSet.has(norm(np.name))) {
              allPlayers.push(np);
              playerSet.add(norm(np.name));
            }
          });
        });

        const allMA = [...(primary.ma_activities || [])];
        const maKeys = new Set(allMA.map(maKey));
        duplicates.forEach(dup => {
          (dup.ma_activities || []).forEach(m => {
            const k = maKey(m);
            if (k && !maKeys.has(k)) { allMA.push(m); maKeys.add(k); }
          });
        });

        const allFunding = [...(primary.funding_rounds || [])];
        const fundKeys = new Set(allFunding.map(fundKey));
        duplicates.forEach(dup => {
          (dup.funding_rounds || []).forEach(f => {
            const k = fundKey(f);
            if (k && !fundKeys.has(k)) { allFunding.push(f); fundKeys.add(k); }
          });
        });

        const bestSummary = [primary, ...duplicates]
          .map(n => n.summary).filter(s => s && s.length > 100)
          .sort((a, b) => b.length - a.length)[0] || primary.summary;
        const bestTLDR = [primary, ...duplicates]
          .map(n => n.tldr).filter(t => t && t.length > 20)
          .sort((a, b) => b.length - a.length)[0] || primary.tldr;

        updates.push({
          id: primary.id,
          themes: allThemes,
          key_takeaways: allTakeaways,
          key_players: allPlayers,
          ma_activities: allMA,
          funding_rounds: allFunding,
          summary: bestSummary,
          tldr: bestTLDR
        });
        duplicates.forEach(d => dupIds.push(d.id));
      } catch (error) {
        console.error(`Error building group for ${group.key}:`, error.message);
      }
    }

    // Apply primary updates in bulk (max 500 per call)
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

    // Cascade-delete duplicates (relations, user states, pack items, alerts, BD links)
    let deletedCount = 0;
    if (dupIds.length > 0) {
      try {
        const res = await deleteNewsletterCascade(base44, dupIds);
        deletedCount = res.deleted || dupIds.length;
      } catch (e) {
        console.error('cascade delete failed:', e.message);
      }
    }

    return Response.json({
      success: true,
      duplicateGroups: duplicateGroups.length,
      updated: updatedCount,
      deleted: deletedCount,
      message: `Merged ${updatedCount} newsletter groups, deleted ${deletedCount} duplicates`
    });

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ success: false, error: error.message || 'Unknown error occurred' }, { status: 500 });
  }
});