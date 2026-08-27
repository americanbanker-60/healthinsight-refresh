import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { requireAdmin } from '../../shared/auth.ts';

// One-time admin migration: converts legacy string key_players entries into
// typed objects { name, type: 'company' }. Already-typed object entries are
// left untouched (idempotent). Object entries missing a `type` get 'company'.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try { user = await requireAdmin(base44); }
    catch (e) { return e instanceof Response ? e : Response.json({ error: 'Unauthorized' }, { status: 401 }); }

    console.log('Starting key_players migration...');
    let cursor = null;
    let converted = 0;
    let skipped = 0;
    let updated = 0;
    const pending = [];

    while (true) {
      const query = cursor ? { created_date: { $lt: cursor } } : {};
      const batch = await base44.asServiceRole.entities.NewsletterItem.filter(query, '-created_date', 500);
      if (!batch || batch.length === 0) break;

      for (const n of batch) {
        if (!Array.isArray(n.key_players) || n.key_players.length === 0) { skipped++; continue; }
        let needsUpdate = false;
        const mapped = n.key_players.map((p) => {
          if (typeof p === 'string') { needsUpdate = true; return { name: p, type: 'company' }; }
          if (p && typeof p === 'object' && !p.type) { needsUpdate = true; return { name: p.name || '', type: 'company' }; }
          return p;
        });
        if (needsUpdate) { pending.push({ id: n.id, key_players: mapped }); converted++; }
        else skipped++;
      }

      // Flush in 500-record bulkUpdate chunks as we go.
      while (pending.length >= 500) {
        const chunk = pending.splice(0, 500);
        try {
          await base44.asServiceRole.entities.NewsletterItem.bulkUpdate(chunk);
          updated += chunk.length;
        } catch (e) { console.error('bulkUpdate chunk failed:', e.message); }
      }

      if (batch.length < 500) break;
      cursor = batch[batch.length - 1].created_date;
      if (!cursor) break;
    }

    for (let i = 0; i < pending.length; i += 500) {
      const chunk = pending.slice(i, i + 500);
      try {
        await base44.asServiceRole.entities.NewsletterItem.bulkUpdate(chunk);
        updated += chunk.length;
      } catch (e) { console.error('bulkUpdate chunk failed:', e.message); }
    }

    console.log(`Migration done: ${converted} records converted, ${updated} updated, ${skipped} skipped`);
    return Response.json({ success: true, converted, updated, skipped });
  } catch (error) {
    console.error('migrateKeyPlayers error:', error.message);
    return Response.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 });
  }
});