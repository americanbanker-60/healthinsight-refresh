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

    console.log('Fetching URL:', url);

    // Fetch the webpage with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const htmlResponse = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!htmlResponse.ok) {
      throw new Error(`Failed to fetch URL: ${htmlResponse.status} ${htmlResponse.statusText}`);
    }
    const htmlContent = await htmlResponse.text();
    console.log('Fetched content length:', htmlContent.length);

    // Extract domain for source name
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');

    console.log('Analyzing with AI...');

    // Analyze with AI
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this healthcare newsletter/article and extract key information.

URL: ${url}
Domain: ${domain}

HTML Content (truncated to first 15000 chars):
${htmlContent.substring(0, 15000)}

Extract:
- title: Clear article title
- source_name: Publication name (use domain "${domain}" as fallback)
- publication_date: Date in YYYY-MM-DD format (today is 2025-12-22, estimate based on content)
- tldr: 2-3 sentence executive summary
- summary: 3-4 paragraph detailed summary
- key_takeaways: 3-5 main points as array
- key_statistics: Array of notable figures with context (can be empty array if none)
- themes: Major topics covered (can be empty array if none)
- key_players: Companies/organizations mentioned (can be empty array if none)
- sentiment: Overall tone (positive/neutral/negative/mixed)
- market_sentiment: Investment market sentiment (bullish/bearish/neutral/mixed) - focus on financial/business implications
- deal_value: If M&A transaction mentioned, extract total value (e.g., "$500M", "undisclosed"), otherwise null
- primary_sector: Primary healthcare sector (Urgent Care, Behavioral Health, Imaging, ASC, Physical Therapy, Dental, Home Health, Anesthesia, MSO, Telehealth, Healthcare IT, Pharmacy, Other)`,
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
          sentiment: { type: "string" },
          market_sentiment: { type: "string" },
          deal_value: { type: ["string", "null"] },
          primary_sector: { type: "string" }
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

    console.log('AI analysis complete:', result.title);
    console.log('Creating newsletter record...');

    // Create newsletter using service role (now allowed via RLS)
    await base44.asServiceRole.entities.Newsletter.create(newsletterData);

    console.log('Newsletter created successfully');

    // Create relations in background (don't await to avoid blocking)
    const createdNewsletter = await base44.asServiceRole.entities.Newsletter.filter({ source_url: url });
    if (createdNewsletter[0]) {
      base44.asServiceRole.functions.invoke('createNewsletterRelations', {
        newsletter_id: createdNewsletter[0].id
      }).catch(err => console.error('Background relation creation failed:', err));
    }

    return Response.json({
      success: true,
      title: result.title,
      source_name: result.source_name
    });

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({
      success: false,
      error: error.message || 'Unknown error occurred'
    }, { status: 500 });
  }
});