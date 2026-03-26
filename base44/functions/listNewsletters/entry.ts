import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query = {}, sort = '-publication_date', limit = 1000 } = await req.json();

    // Always fetch using a reliable sort field. The caller's preferred sort is applied
    // client-side below. Using '-created_date' avoids failures from unsupported sort
    // fields like '-date_added_to_app' or empty publication_date values.
    const all = await base44.asServiceRole.entities.NewsletterItem.list('-created_date', Math.max(limit * 2, 2000));

    // Apply query filters. Use flexible matching for booleans since the SDK may
    // return numeric 1/0 or string "true"/"false" instead of strict JS booleans.
    const filtered = Object.keys(query).length === 0
      ? all
      : all.filter(n => Object.entries(query).every(([k, v]) => {
          if (typeof v === 'boolean') return !!n[k] === v;
          return n[k] === v;
        }));

    // Apply the caller's requested sort order client-side
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortDir = sort.startsWith('-') ? -1 : 1;
    filtered.sort((a, b) => {
      const av = a[sortField] || '';
      const bv = b[sortField] || '';
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });

    return Response.json({ success: true, newsletters: filtered.slice(0, limit) });
  } catch (error) {
    console.error('listNewsletters error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
