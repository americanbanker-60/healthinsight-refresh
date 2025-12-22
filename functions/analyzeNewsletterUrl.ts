import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await req.json();

    if (!url) {
      return Response.json({ error: 'URL required' }, { status: 400 });
    }

    // Fetch the webpage
    const htmlResponse = await fetch(url);
    if (!htmlResponse.ok) {
      throw new Error(`Failed to fetch (${htmlResponse.status})`);
    }
    const htmlContent = await htmlResponse.text();

    // Extract domain for source name
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');

    // Analyze with AI
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this healthcare newsletter/article and extract key information.

URL: ${url}
Domain: ${domain}

HTML Content (truncated):
${htmlContent.substring(0, 15000)}

Extract:
- title: Clear article title
- source_name: Publication name (use domain "${domain}" as fallback)
- publication_date: Date in YYYY-MM-DD format (estimate if unclear)
- tldr: 2-3 sentence executive summary
- summary: 3-4 paragraph detailed summary
- key_takeaways: 3-5 main points as array
- key_statistics: Array of notable figures with context
- themes: Major topics covered
- key_players: Companies/organizations mentioned
- sentiment: Overall tone (positive/neutral/negative/mixed)`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          source_name: { type: "string" },
          publication_date: { type: "string" },
          tldr: { type: "string" },
          summary: { type: "string" },
          key_takeaways: { type: "array", items: { type: "string" } },
          key_statistics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                figure: { type: "string" },
                context: { type: "string" }
              }
            }
          },
          themes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                theme: { type: "string" },
                description: { type: "string" }
              }
            }
          },
          key_players: { type: "array", items: { type: "string" } },
          sentiment: { type: "string" }
        }
      }
    });

    // Add metadata
    const newsletterData = {
      ...result,
      source_url: url,
      date_added_to_app: new Date().toISOString(),
      publication_date_confidence: "medium",
      publication_date_source: "AI extraction",
      publication_date_notes: "Direct upload via admin panel"
    };

    // Create newsletter
    await base44.asServiceRole.entities.Newsletter.create(newsletterData);

    return Response.json({
      success: true,
      title: result.title,
      source_name: result.source_name
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});