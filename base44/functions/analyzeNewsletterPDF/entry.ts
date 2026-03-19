import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, sourceName } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url required' }, { status: 400 });
    }

    console.log('Extracting data from PDF:', file_url);

    // Check for duplicate first
    const existingNewsletters = await base44.asServiceRole.entities.NewsletterItem.filter({ source_url: file_url });
    if (existingNewsletters.length > 0) {
      console.log('Duplicate PDF — skipping');
      return Response.json({
        success: true,
        message: 'Newsletter with this PDF already exists. Skipped to prevent duplicates.',
        id: existingNewsletters[0].id,
        title: existingNewsletters[0].title
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Build cross-reference context from existing DB
    let crossRefContext = '';
    try {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const recentNewsletters = await base44.asServiceRole.entities.NewsletterItem.filter(
        { publication_date: { $gte: sixtyDaysAgo }, is_analyzed: true },
        '-publication_date',
        50
      );

      if (recentNewsletters.length > 0) {
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

    const prompt = `You are a senior healthcare private equity analyst. Your job is to extract sharp, investment-grade intelligence from this healthcare PDF document — NOT generic summaries. Every insight must be specific, opinionated, and actionable for a PE investor.

Today's date: ${today}

${crossRefContext ? `EXISTING DATABASE CONTEXT (use this to add cross-reference signals):
${crossRefContext}
` : ''}

EXTRACTION RULES — follow these strictly:

**title**: The exact document title.

**source_name**: Publication or organization name.

**publication_date**: Look hard for the actual publication date in the document (headers, footers, cover page, date stamps). Return YYYY-MM-DD. If genuinely not found, use ${today} but set low confidence.

**publication_date_confidence**: 
- "high" = explicit date found in document
- "medium" = inferred from document context or relative language
- "low" = no date found, using today as fallback

**publication_date_source**: Where you found the date (e.g., "document cover page", "footer", "no date found — used today")

**tldr**: 2-3 sentences. Format: "[Company/Actor] did [specific thing], which signals [specific implication for healthcare PE]. This matters because [concrete consequence]." NO generic statements.

**key_takeaways**: 3-5 items. Each MUST follow: "[Specific company/actor] is [doing specific thing], which means [concrete implication] for [specific sector/buyers/sellers]." BAD: "Healthcare consolidation is accelerating." GOOD: "Optum's acquisition of [Target] at [X]x EBITDA signals aggressive roll-up appetite in the MSO space."

**key_statistics**: Every number, multiple, percentage, dollar figure mentioned. Include context for each.

**themes**: 3-5 specific themes. theme = concise label (e.g., "MSO Platform Build-Up"). description = 1-2 sentences on what's specifically happening.

**key_players**: All companies, PE firms, payors, health systems, named executives mentioned.

**ma_activities**: For EVERY M&A transaction:
- acquirer, target, deal_value (exact or "undisclosed"), deal_structure ("majority"/"minority"/"full acquisition"/"merger"/"asset purchase"/"unknown"), implied_multiple (e.g., "12x EBITDA" or null), strategic_rationale (1 sentence why), description

**funding_rounds**: For every funding event:
- company, amount, round_type (Series A/B/C, Growth Equity, Recapitalization, etc.), lead_investor (or null), description

**recommended_actions**: 3-5 specific PE investor actions. Format: verb + specific action + why. E.g., "Map competitive targets in [sector] before [Company] absorbs available options." NOT "Monitor the situation."

**sentiment**: positive/neutral/negative/mixed

**market_sentiment**: bullish/bearish/neutral/mixed

**primary_sector**: Urgent Care, Behavioral Health, Imaging, ASC, Physical Therapy, Dental, Home Health, Anesthesia, MSO, Telehealth, Healthcare IT, Pharmacy, Other

**cross_reference_signals**: Based on the EXISTING DATABASE CONTEXT, list signals like "3rd mention of [Company] in 60 days" or "[Sector] appears in 4 recent articles". Empty array if no context.`;

    const rawResult = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [file_url],
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          source_name: { type: "string" },
          publication_date: { type: "string" },
          publication_date_confidence: { type: "string" },
          publication_date_source: { type: "string" },
          tldr: { type: "string" },
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
          primary_sector: { type: "string" },
          cross_reference_signals: { type: "array", items: { type: "string" } }
        }
      }
    });

    // Unwrap if LLM returned a nested response object
    const result = rawResult?.response || rawResult;

    // Ensure title exists — required field
    if (!result.title) {
      result.title = result.source_name || sourceName || 'Untitled Document';
    }

    console.log('PDF analysis complete:', result.title);

    const newsletterData = {
      ...result,
      source_url: file_url,
      source_name: sourceName || result.source_name || 'PDF Upload',
      content_type: 'PDF',
      source_type: 'PDF',
      date_added_to_app: new Date().toISOString(),
      publication_date: result.publication_date || today,
      publication_date_confidence: result.publication_date_confidence || 'low',
      publication_date_source: result.publication_date_source || 'PDF document',
      publication_date_notes: 'Direct PDF upload',
      status: 'processing'
    };

    console.log('Creating newsletter record...');
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
      message: 'PDF analyzed and newsletter created successfully',
      newsletter: { ...newsletterData, id: newsletterId, status: 'completed', is_analyzed: true }
    });

  } catch (error) {
    console.error('ERROR:', error.message);
    return Response.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 });
  }
});