import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Iterates all analyzed articles and creates Company entity records
 * for any key_player name not already in the Companies directory.
 * Also creates/refreshes NewsletterRelation links.
 * Safe to run multiple times — skips companies that already exist.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all analyzed articles and existing companies in parallel
    const [allArticles, existingCompanies] = await Promise.all([
      base44.asServiceRole.entities.NewsletterItem.list('-created_date', 2000),
      base44.asServiceRole.entities.Company.list()
    ]);

    const analyzedArticles = allArticles.filter((n: any) => n.is_analyzed);
    const existingNames = new Set(existingCompanies.map((c: any) => c.company_name.toLowerCase()));

    let companiesCreated = 0;
    let relationsProcessed = 0;

    for (const article of analyzedArticles) {
      if (!article.key_players || !Array.isArray(article.key_players)) continue;

      // Create Company records for any new key_players
      for (const playerName of article.key_players) {
        if (playerName && !existingNames.has(playerName.toLowerCase())) {
          try {
            const created = await base44.asServiceRole.entities.Company.create({
              company_name: playerName,
              description: `Identified in: ${(article.title || '').slice(0, 150)}`
            });
            if (created?.id) {
              existingNames.add(playerName.toLowerCase());
              companiesCreated++;
            }
          } catch (_) {}
        }
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
    console.error('backfillCompaniesFromArticles error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
