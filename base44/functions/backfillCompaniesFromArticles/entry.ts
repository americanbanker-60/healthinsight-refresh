import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { requireAdmin } from '../../shared/auth.ts';

/**
 * Iterates all analyzed articles and creates Company entity records
 * for any key_player name not already in the Companies directory.
 * Also creates/refreshes NewsletterRelation links.
 * Safe to run multiple times — skips companies that already exist.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireAdmin(base44);

    // Fetch all analyzed articles and existing companies in parallel
    const [allArticles, existingCompanies] = await Promise.all([
      base44.asServiceRole.entities.NewsletterItem.filter({ is_analyzed: true }, '-created_date', 2000),
      base44.asServiceRole.entities.Company.list('company_name', 2000)
    ]);

    const analyzedArticles = (allArticles || []);
    const existingNames = new Set((existingCompanies || []).map(c => c.company_name.toLowerCase()));

    let companiesCreated = 0;
    let relationsProcessed = 0;

    for (const article of analyzedArticles) {
      if (!article.key_players || !Array.isArray(article.key_players)) continue;

      // Create Company records for any new key_players (non-person types only)
      for (const raw of (article.key_players || [])) {
        const kp = typeof raw === 'string' ? { name: raw, type: 'company' } : raw;
        if (!kp || !kp.name || kp.type === 'person') continue;
        if (kp.name.length < 4) continue;
        const lower = kp.name.toLowerCase();
        if (existingNames.has(lower)) continue;
        try {
          const created = await base44.asServiceRole.entities.Company.create({
            company_name: kp.name,
            description: `Identified in: ${(article.title || '').slice(0, 150)}`
          });
          if (created?.id) {
            existingNames.add(lower);
            companiesCreated++;
          }
        } catch (_) {}
      }

      // Re-run relations for this article (picks up newly created companies too)
      try {
        await base44.asServiceRole.functions.invoke('createNewsletterRelations', {
          newsletter_id: article.id,
          newsletter_data: article
        });
        relationsProcessed++;
      } catch (_) {}
    }

    return Response.json({
      success: true,
      articles_processed: analyzedArticles.length,
      companies_created: companiesCreated,
      relations_processed: relationsProcessed
    });

  } catch (error) {
    if (error instanceof Response) return error;
    console.error('backfillCompaniesFromArticles error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});