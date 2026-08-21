import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Two-phase newsletter discovery + batch import:
//   action: "discover" → AI scans a source/archive/index page and returns the
//            individual newsletter issues listed there (no records created).
//   action: "import"   → queues the user-selected issue URLs as pending
//            BulkImportJob records (service role), so the existing
//            processBulkImportQueue pipeline analyzes them just like bulk URL
//            imports. BulkImportJob.create is admin-only under RLS, so we
//            elevate here to let any authenticated user run the workflow.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, sourceUrl, urls, sourceName } = body || {};

    if (action === 'discover') {
      if (!sourceUrl) return Response.json({ error: 'sourceUrl is required' }, { status: 400 });

      const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are analyzing a healthcare newsletter source/archive/index page: ${sourceUrl}

Task: Discover the individual newsletter issues or articles listed on this page. Return up to 20 of the most recent ones.

For each issue, extract:
- title: The issue or article title
- source_url: The direct, full absolute URL to that individual issue/article
- publication_date: Publication date if visible on the page (YYYY-MM-DD format, otherwise null)

Rules:
- Only include actual individual newsletter issues/articles that each have their own dedicated URL.
- Do NOT include the archive/index page itself, category/tag pages, author pages, or non-article links.
- If the page is itself a single article (not an index), return just that one article.
- If you cannot find any individual issues, return an empty array.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            issues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  source_url: { type: 'string' },
                  publication_date: { type: 'string' },
                },
                required: ['title', 'source_url'],
              },
            },
          },
        },
      });

      const issues = (aiResponse.issues || []).filter((i) => i && i.source_url);
      return Response.json({ success: true, issues });
    }

    if (action === 'import') {
      if (!Array.isArray(urls) || urls.length === 0) {
        return Response.json({ error: 'urls array is required' }, { status: 400 });
      }
      const batchId = `discover_${Date.now()}`;
      const batchName =
        (sourceName && sourceName.trim()) ||
        `Source Discovery ${new Date().toLocaleDateString()} — ${urls.length} URLs`;
      const jobs = urls.map((u) => ({
        batch_id: batchId,
        batch_name: batchName,
        url: u,
        source_name: (sourceName && sourceName.trim()) || undefined,
        status: 'pending',
      }));
      await base44.asServiceRole.entities.BulkImportJob.bulkCreate(jobs);
      return Response.json({ success: true, queued: jobs.length, batch_id: batchId });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});