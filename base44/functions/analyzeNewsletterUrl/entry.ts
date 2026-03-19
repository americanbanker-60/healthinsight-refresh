import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Shared PE-focused analysis prompt builder
function buildAnalysisPrompt({ contentBlock, domain, today, crossRefContext }) {
  return `You are a senior healthcare private equity analyst. Your job is to extract sharp, investment-grade intelligence from healthcare articles — NOT generic summaries. Every insight must be specific, opinionated, and actionable for a PE investor.

${contentBlock}

Today's date: ${today}

${crossRefContext ? `EXISTING DATABASE CONTEXT (use this to add cross-reference signals):
${crossRefContext}
` : ''}

EXTRACTION RULES — follow these strictly:

**title**: The exact article title.

**source_name**: Publication name. Use domain "${domain}" as fallback.

**publication_date**: Look hard for the actual publication date in the content (byline, metadata, "Published:", timestamps, URL date patterns). Return YYYY-MM-DD. If genuinely not found, use ${today} but set low confidence.

**publication_date_confidence**: 
- "high" = explicit date found in article text or byline
- "medium" = inferred from URL pattern or relative language ("last week", "this month")
- "low" = no date signals found, using today as fallback

**publication_date_source**: Where you found the date (e.g., "article byline", "URL pattern /2024/03/", "relative language 'last week'", "no date found — used today")

**tldr**: 2-3 sentences. Format: "[Company/Actor] did [specific thing], which signals [specific implication for healthcare PE]. This matters because [concrete consequence — valuation impact, sector shift, competitive move]." NO generic statements like "consolidation is accelerating."

**summary**: 3-4 paragraphs of investment-grade analysis. Paragraph 1: what happened and who. Paragraph 2: financial/strategic context (deal size, multiples if mentioned, market position). Paragraph 3: sector implications. Paragraph 4: risks or headwinds. Be specific — cite numbers, company names, percentages from the article.

**key_takeaways**: 3-5 items. Each MUST follow format: "[Specific company/actor] is [doing specific thing], which means [concrete implication] for [specific sector/buyers/sellers]." BAD: "Healthcare consolidation is accelerating." GOOD: "Optum's acquisition of [Target] at [X]x EBITDA signals aggressive roll-up appetite in the MSO space, compressing available targets for mid-market PE."

**key_statistics**: Every number, multiple, percentage, dollar figure, or metric mentioned. Include context for each.

**themes**: 3-5 specific themes. theme field = concise label (e.g., "MSO Platform Build-Up", "Payor-Provider Convergence"). description field = 1-2 sentences on what's specifically happening, not a generic definition.

**key_players**: All companies, PE firms, payors, health systems, and named executives mentioned.

**ma_activities**: For EVERY M&A transaction mentioned, extract:
- acquirer: buyer name
- target: target company name  
- deal_value: exact amount if stated (e.g., "$450M", "$1.2B"), "undisclosed" if not mentioned
- deal_structure: "majority", "minority", "full acquisition", "merger", "asset purchase", or "unknown"
- implied_multiple: any EBITDA/revenue multiple mentioned (e.g., "12x EBITDA"), or null
- strategic_rationale: 1 sentence on why this deal happened (geographic expansion, capability add, defensive move, etc.)
- description: full context sentence

**funding_rounds**: For every funding event:
- company, amount, round_type (Series A/B/C, Growth Equity, Recapitalization, etc.), lead_investor if named, description

**recommended_actions**: 3-5 specific actions for a healthcare PE investor reading this. Format: verb + specific action + why. E.g., "Map competitive targets in [sector] before [Company]'s platform build-up absorbs available options." NOT "Monitor the situation."

**sentiment**: positive/neutral/negative/mixed (tone of the article itself)

**market_sentiment**: bullish/bearish/neutral/mixed (investment outlook implied by the content)

**primary_sector**: Urgent Care, Behavioral Health, Imaging, ASC, Physical Therapy, Dental, Home Health, Anesthesia, MSO, Telehealth, Healthcare IT, Pharmacy, Other

**cross_reference_signals**: Based on the EXISTING DATABASE CONTEXT provided, list any signals like: "3rd mention of [Company] in 60 days", "[Company] was involved in a deal 45 days ago", "Behavioral Health sector appears in 4 recent articles". If no context was provided, return empty array.`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, sourceName } = await req.json();

    if (!url) {
      return Response.json({ error: 'URL required' }, { status: 400 });
    }

    // Normalize URL
    const normalizeUrl = (u) => u.trim().toLowerCase().replace(/\/+$/, '');
    const normalizedUrl = normalizeUrl(url);
    console.log('Fetching URL:', normalizedUrl);

    // Check duplicate early
    const existingCheck = await base44.asServiceRole.entities.NewsletterItem.filter({ source_url: normalizedUrl });
    if (existingCheck.length > 0) {
      console.log('Duplicate — skipping');
      return Response.json({
        success: true,
        message: 'Newsletter with this URL already exists. Skipped to prevent duplicates.',
        id: existingCheck[0].id,
        title: existingCheck[0].title,
        source_name: existingCheck[0].source_name
      });
    }

    // Fetch webpage
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    let textContent = null;
    let useFallback = false;

    try {
      const htmlResponse = await fetch(normalizedUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!htmlResponse.ok) {
        useFallback = true;
      } else {
        const rawHtml = await htmlResponse.text();
        textContent = rawHtml
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();
        if (textContent.length < 200) useFallback = true;
      }
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      useFallback = true;
    }

    const urlObj = new URL(normalizedUrl);
    const domain = urlObj.hostname.replace('www.', '');
    const today = new Date().toISOString().split('T')[0];

    // Build cross-reference context from existing DB
    let crossRefContext = '';
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const recentNewsletters = await base44.asServiceRole.entities.NewsletterItem.filter(
        { publication_date: { $gte: sixtyDaysAgo }, is_analyzed: true },
        '-publication_date',
        50
      );

      if (recentNewsletters.length > 0) {
        // Build company mention frequency
        const companyMentions = {};
        const sectorCounts = {};
        recentNewsletters.forEach(n => {
          (n.key_players || []).forEach(p => {
            companyMentions[p] = (companyMentions[p] || 0) + 1;
          });
          if (n.primary_sector) sectorCounts[n.primary_sector] = (sectorCounts[n.primary_sector] || 0) + 1;
        });

        const frequentCompanies = Object.entries(companyMentions)
          .filter(([, count]) => count >= 2)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([name, count]) => `${name} (${count} mentions in 60 days)`);

        const activeSectors = Object.entries(sectorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([sector, count]) => `${sector} (${count} articles)`);

        const recentDeals = recentNewsletters
          .filter(n => n.ma_activities && n.ma_activities.length > 0)
          .slice(0, 5)
          .flatMap(n => n.ma_activities.map(m => `${m.acquirer} → ${m.target} (${n.publication_date})`));

        crossRefContext = [
          frequentCompanies.length > 0 ? `Frequently mentioned companies (last 60 days): ${frequentCompanies.join(', ')}` : '',
          activeSectors.length > 0 ? `Most active sectors: ${activeSectors.join(', ')}` : '',
          recentDeals.length > 0 ? `Recent deals in DB: ${recentDeals.join('; ')}` : '',
        ].filter(Boolean).join('\n');
      }
    } catch (ctxErr) {
      console.warn('Cross-reference context fetch failed (non-fatal):', ctxErr.message);
    }

    console.log(`Analyzing with AI... (mode: ${useFallback ? 'internet-fallback' : 'html-content'})`);

    const contentBlock = useFallback
      ? `URL to analyze: ${normalizedUrl}\nDomain: ${domain}`
      : `URL: ${normalizedUrl}\nDomain: ${domain}\n\nArticle Text:\n${textContent.substring(0, 14000)}`;

    const prompt = buildAnalysisPrompt({ contentBlock, domain, today, crossRefContext });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: useFallback,
      model: useFallback ? 'gemini_3_flash' : 'claude_sonnet_4_6',
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          source_name: { type: "string" },
          publication_date: { type: "string" },
          publication_date_confidence: { type: "string" },
          publication_date_source: { type: "string" },
          tldr: { type: "string" },
          summary: { type: "string" },
          key_takeaways: { type: "array", items: { type: "string" } },
          key_statistics: {
            type: "array",
            items: { type: "object", properties: { figure: { type: "string" }, context: { type: "string" } } }
          },
          themes: {
            type: "array",
            items: { type: "object", properties: { theme: { type: "string" }, description: { type: "string" } } }
          },
          key_players: { type: "array", items: { type: "string" } },
          ma_activities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                acquirer: { type: "string" },
                target: { type: "string" },
                deal_value: { type: "string" },
                deal_structure: { type: "string" },
                implied_multiple: { type: ["string", "null"] },
                strategic_rationale: { type: "string" },
                description: { type: "string" }
              }
            }
          },
          funding_rounds: {
            type: "array",
            items: {
              type: "object",
              properties: {
                company: { type: "string" },
                amount: { type: "string" },
                round_type: { type: "string" },
                lead_investor: { type: ["string", "null"] },
                description: { type: "string" }
              }
            }
          },
          recommended_actions: { type: "array", items: { type: "string" } },
          sentiment: { type: "string" },
          market_sentiment: { type: "string" },
          deal_value: { type: ["string", "null"] },
          primary_sector: { type: "string" },
          cross_reference_signals: { type: "array", items: { type: "string" } }
        }
      }
    });

    const newsletterData = {
      ...result,
      source_url: normalizedUrl,
      source_name: sourceName || result.source_name || 'Unknown Source',
      content_type: 'URL',
      raw_input: useFallback ? `[Fallback: internet browsing used] URL: ${normalizedUrl}` : textContent?.substring(0, 20000),
      date_added_to_app: new Date().toISOString(),
      publication_date_confidence: result.publication_date_confidence || 'medium',
      publication_date_source: result.publication_date_source || 'AI extraction',
      publication_date_notes: useFallback ? 'Fallback internet browsing used' : 'Direct URL upload',
      status: 'processing'
    };

    console.log('AI analysis complete:', result.title);

    const createdRecord = await base44.asServiceRole.entities.NewsletterItem.create(newsletterData);
    const newsletterId = createdRecord?.id;
    if (!newsletterId) {
      return Response.json({ success: false, error: 'Failed to get newsletter ID' }, { status: 500 });
    }

    console.log(`Newsletter ID: ${newsletterId} — linking relations`);

    try {
      const [companies, topics] = await Promise.all([
        base44.asServiceRole.entities.Company.list(),
        base44.asServiceRole.entities.Topic.list()
      ]);

      const searchText = [
        result.title || '',
        result.summary || '',
        result.tldr || '',
        ...(result.key_takeaways || []),
        ...(result.key_players || []),
        ...(result.themes?.map(t => `${t.theme} ${t.description}`) || [])
      ].join(' ').toLowerCase();

      const relations = [];

      for (const company of companies) {
        let score = 0;
        if (searchText.includes(company.company_name.toLowerCase())) score = 10;
        for (const alias of (company.known_aliases || [])) {
          if (alias && searchText.includes(alias.toLowerCase())) score = Math.max(score, 9);
        }
        for (const kw of (company.primary_keywords || [])) {
          if (kw && searchText.includes(kw.toLowerCase())) score = Math.max(score, 7);
        }
        if (score > 0) relations.push({ newsletter_id: newsletterId, entity_type: 'company', entity_id: company.id, entity_name: company.company_name, relevance_score: score });
      }

      for (const topic of topics) {
        let score = 0;
        for (const kw of (topic.keywords || [])) {
          if (kw && searchText.includes(kw.toLowerCase())) score = Math.max(score, 8);
        }
        for (const theme of (result.themes || [])) {
          if (theme.theme && theme.theme.toLowerCase() === topic.topic_name.toLowerCase()) score = 10;
        }
        if (score > 0) relations.push({ newsletter_id: newsletterId, entity_type: 'topic', entity_id: topic.id, entity_name: topic.topic_name, relevance_score: score });
      }

      if (relations.length > 0) {
        await base44.asServiceRole.entities.NewsletterRelation.bulkCreate(relations);
      }

      await base44.asServiceRole.entities.NewsletterItem.update(newsletterId, { status: 'completed', is_analyzed: true });
      console.log(`Relations linked: ${relations.length}, newsletter marked completed`);
    } catch (relErr) {
      console.error('Relations linking failed (non-fatal):', relErr.message);
      await base44.asServiceRole.entities.NewsletterItem.update(newsletterId, { status: 'completed', is_analyzed: true });
    }

    return Response.json({
      success: true,
      id: newsletterId,
      title: result.title,
      source_name: result.source_name,
      newsletter: { ...newsletterData, id: newsletterId, status: 'completed', is_analyzed: true }
    });

  } catch (error) {
    console.error('ERROR:', error.message);
    return Response.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 });
  }
});