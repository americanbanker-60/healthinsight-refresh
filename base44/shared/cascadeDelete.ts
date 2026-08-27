// Cascade delete for NewsletterItems and their dependent rows.
//
// Deletes, for the given NewsletterItem ids:
//   - NewsletterRelation (newsletter_id)
//   - UserArticleState (newsletter_id)
//   - UserCustomPackItem (item_id)
//   - TopicAlert (item_id)
//   - BDOpportunity.newsletter_id is nulled (opportunity preserved)
// ...and only then deletes the NewsletterItems themselves.
//
// Every child step is best-effort (caught + logged) so a partial failure on one
// entity never blocks the parent NewsletterItem delete. Deletes are batched in
// chunks of 500 because deleteMany/updateMany $in filters can be large.

const CHUNK = 500;

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function safe(label, fn) {
  try { return await fn(); }
  catch (e) { console.warn(`cascadeDelete ${label} failed (non-fatal):`, e?.message || e); return null; }
}

export async function deleteNewsletterCascade(base44, ids) {
  if (!ids || ids.length === 0) return { deleted: 0 };

  for (const c of chunk(ids, CHUNK)) {
    await safe('NewsletterRelation.deleteMany', () =>
      base44.asServiceRole.entities.NewsletterRelation.deleteMany({ newsletter_id: { $in: c } }));
    await safe('UserArticleState.deleteMany', () =>
      base44.asServiceRole.entities.UserArticleState.deleteMany({ newsletter_id: { $in: c } }));
    await safe('UserCustomPackItem.deleteMany', () =>
      base44.asServiceRole.entities.UserCustomPackItem.deleteMany({ item_id: { $in: c } }));
    await safe('TopicAlert.deleteMany', () =>
      base44.asServiceRole.entities.TopicAlert.deleteMany({ item_id: { $in: c } }));
    // Null BDOpportunity.newsletter_id so the opportunity is preserved but unlinked.
    // Prefer $set null (reliably supported); fall back to $unset if that errors.
    await safe('BDOpportunity.updateMany(set null)', async () => {
      try {
        await base44.asServiceRole.entities.BDOpportunity.updateMany(
          { newsletter_id: { $in: c } },
          { $set: { newsletter_id: null } }
        );
      } catch (_) {
        await base44.asServiceRole.entities.BDOpportunity.updateMany(
          { newsletter_id: { $in: c } },
          { $unset: { newsletter_id: "" } }
        );
      }
    });
  }

  let deleted = 0;
  for (const c of chunk(ids, CHUNK)) {
    await safe('NewsletterItem.deleteMany', async () => {
      await base44.asServiceRole.entities.NewsletterItem.deleteMany({ id: { $in: c } });
      deleted += c.length;
    });
  }

  return { deleted };
}