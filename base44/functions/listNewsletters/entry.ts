import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query = {}, sort = '-publication_date', limit = 1000 } = await req.json();

    // Use list() instead of filter() — the SDK's filter() does not reliably support
    // boolean field comparisons or sort/limit parameters. list() + client-side filter
    // is the proven pattern used by scrapeSource and fixAnalyzedFlag.
    const all = await base44.asServiceRole.entities.NewsletterItem.list(sort, limit * 2);

    const newsletters = Object.keys(query).length === 0
      ? all
      : all.filter(n => Object.entries(query).every(([k, v]) => n[k] === v));

    console.log(`listNewsletters: fetched ${all.length} total, returned ${newsletters.length} after filter`, JSON.stringify(query));

    return Response.json({ success: true, newsletters: newsletters.slice(0, limit) });
  } catch (error) {
    console.error('listNewsletters error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
