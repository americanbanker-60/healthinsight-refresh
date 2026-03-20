import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query = {}, sort = '-publication_date', limit = 1000 } = await req.json();

    const newsletters = await base44.entities.NewsletterItem.filter(query, sort, limit);
    return Response.json({ success: true, newsletters });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});