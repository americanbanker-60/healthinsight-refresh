import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Returns analyzed newsletters uploaded by the current user.
// Uses asServiceRole so it queries the same DB environment as the analyze
// functions that save records — guaranteeing consistent read-after-write.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await base44.asServiceRole.entities.NewsletterItem.filter(
      { uploaded_by: user.email }
    );

    const analyzed = (items || []).filter(
      n => !!n.is_analyzed || n.status === 'completed'
    );

    return Response.json({ success: true, items: analyzed });

  } catch (error) {
    console.error('getMyNewsletters error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
