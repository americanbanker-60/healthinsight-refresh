import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query = {}, sort = '-publication_date', limit = 1000 } = await req.json();

    // Fetch all records — try asServiceRole first (sees all users' data),
    // fall back to user client (sees current user's data) if asServiceRole 403s.
    let all: any[] = [];
    try {
      all = await base44.asServiceRole.entities.NewsletterItem.list('-created_date', Math.max(limit * 2, 2000));
    } catch (_) {
      try {
        all = await base44.entities.NewsletterItem.list('-created_date', Math.max(limit * 2, 2000));
      } catch (_) {}
    }

    // Apply query filters with support for booleans, $in operator, and range queries
    const matchesFilter = (record, query) => {
      return Object.entries(query).every(([k, v]) => {
        if (typeof v === 'boolean') return !!record[k] === v;
        if (v && typeof v === 'object') {
          // Handle $in operator
          if (v.$in) return v.$in.includes(record[k]);
          // Handle range operators ($gte, $lte)
          if (v.$gte !== undefined || v.$lte !== undefined) {
            const val = record[k] || '';
            if (v.$gte && val < v.$gte) return false;
            if (v.$lte && val > v.$lte) return false;
            return true;
          }
        }
        return record[k] === v;
      });
    };

    const filtered = Object.keys(query).length === 0
      ? all
      : all.filter(n => matchesFilter(n, query));

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