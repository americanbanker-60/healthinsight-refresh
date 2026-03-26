import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newsletter_id, data } = await req.json();
    if (!newsletter_id || !data) {
      return Response.json({ error: 'Missing newsletter_id or data' }, { status: 400 });
    }

    await base44.asServiceRole.entities.NewsletterItem.update(newsletter_id, data);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});