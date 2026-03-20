import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newsletterId } = await req.json();
    if (!newsletterId) {
      return Response.json({ error: 'newsletterId required' }, { status: 400 });
    }

    const newsletter = await base44.asServiceRole.entities.NewsletterItem.get(newsletterId);

    if (!newsletter) {
      return Response.json({ success: false, error: 'Newsletter not found' }, { status: 404 });
    }

    return Response.json({ success: true, newsletter });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});