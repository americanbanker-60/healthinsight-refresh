import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

    const body = await req.json();
    const { url, sourceName } = body;

    if (!url) {
      return Response.json({ error: 'URL required' }, { status: 400 });
    }

    // Normalize URL
    const normalizeUrl = (u) => u.trim().toLowerCase().replace(/\/+$/, '');
    const normalizedUrl = normalizeUrl(url);

    // Duplicate check — non-blocking try-catch so a transient 403 doesn't kill the request
    let existingCheck = [];
    try {
      existingCheck = await base44.asServiceRole.entities.NewsletterItem.filter({
        source_url: normalizedUrl,
        uploaded_by: user.email
      });
    } catch (_) {}
    if (existingCheck.length > 0) {
      return Response.json({
        success: true,
        isDuplicate: true,
        analysis: existingCheck[0],
        newsletter: existingCheck[0],
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
      const allRecent = await base44.asServiceRole.entities.NewsletterItem.list('-publication_date', 100);
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const recentNewsletters = allRecent.filter(n => n.is_analyzed && n.publication_date >= sixtyDaysAgo).slice(0, 50);

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


    const contentBlock = useFallback
      ? `URL to analyze: ${normalizedUrl}\nDomain: ${domain}`
      : `URL: ${normalizedUrl}\nDomain: ${domain}\n\nArticle Text:\n${textContent.substring(0, 14000)}`;

    const prompt = buildAnalysisPrompt({ contentBlock, domain, today, crossRefContext });

    const rawResult = await base44.integrations.Core.InvokeLLM({
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
                implied_multiple: { type: "string" },
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
                lead_investor: { type: "string" },
                description: { type: "string" }
              }
            }
          },
          recommended_actions: { type: "array", items: { type: "string" } },
          sentiment: { type: "string" },
          market_sentiment: { type: "string" },
          deal_value: { type: "string" },
          primary_sector: { type: "string" },
          cross_reference_signals: { type: "array", items: { type: "string" } }
        }
      }
    });

    // Unwrap if LLM returned a nested response object
    const result = rawResult?.response || rawResult;

    // Ensure title exists — required field
    if (!result.title) {
      result.title = result.source_name || domain || 'Untitled Article';
    }

    // Normalize arrays — LLM sometimes returns strings instead of objects.
    // IMPORTANT: build field-by-field (never spread ...result).
    // Spreading passes unknown fields (e.g. cross_reference_signals) that are
    // not in the entity schema and cause asServiceRole.create() to fail silently.
    const normalizedThemes = (result.themes || []).map(t =>
      typeof t === 'string' ? { theme: t, description: '' } : t
    );
    const normalizedStats = (result.key_statistics || []).map(s =>
      typeof s === 'string' ? { figure: s, context: '' } : s
    );
    const normalizedMA = (result.ma_activities || []).map(m =>
      typeof m === 'string' ? { acquirer: '', target: '', deal_value: '', description: m } : m
    );
    const normalizedFunding = (result.funding_rounds || []).map(f =>
      typeof f === 'string' ? { company: '', amount: f, round_type: '', description: f } : f
    );

    const newsletterData = {
      title: result.title,
      source_url: normalizedUrl,
      source_name: sourceName || result.source_name || 'Unknown Source',
      source_type: 'URL',
      content_type: 'URL',
      publication_date: result.publication_date || null,
      publication_date_confidence: result.publication_date_confidence || 'medium',
      publication_date_source: result.publication_date_source || 'AI extraction',
      publication_date_notes: useFallback ? 'Fallback internet browsing used' : 'Direct URL upload',
      tldr: result.tldr || null,
      key_takeaways: result.key_takeaways || [],
      key_statistics: normalizedStats,
      themes: normalizedThemes,
      key_players: result.key_players || [],
      ma_activities: normalizedMA,
      funding_rounds: normalizedFunding,
      recommended_actions: result.recommended_actions || [],
      sentiment: result.sentiment || null,
      market_sentiment: result.market_sentiment || null,
      deal_value: result.deal_value || null,
      primary_sector: result.primary_sector || null,
      date_added_to_app: new Date().toISOString(),
      uploaded_by: user.email,
      status: 'completed',
      is_analyzed: true
    };

    // Save to DB — try user client first (works for user-invoked functions),
    // fall back to asServiceRole (works for background/scheduled functions).
    let savedRecord = newsletterData;
    try {
      const created = await base44.entities.NewsletterItem.create(newsletterData);
      if (created?.id) {
        savedRecord = created;
        base44.asServiceRole.functions.invoke('createNewsletterRelations', {
          newsletter_id: created.id,
          newsletter_data: created
        }).catch(() => {});
      } else {
        throw new Error('user-client create returned no id');
      }
    } catch (e1) {
      console.warn('User-client save failed, trying asServiceRole:', e1.message);
      try {
        const created = await base44.asServiceRole.entities.NewsletterItem.create(newsletterData);
        if (created?.id) {
          savedRecord = created;
          base44.asServiceRole.functions.invoke('createNewsletterRelations', {
            newsletter_id: created.id,
            newsletter_data: created
          }).catch(() => {});
        } else {
          console.warn('asServiceRole save also returned no id — article saved to localStorage only');
        }
      } catch (e2) {
        console.warn('Both save methods failed:', e2.message);
      }
    }

    return Response.json({
      success: true,
      isDuplicate: false,
      analysis: savedRecord,
      newsletter: savedRecord,
      id: savedRecord.id
    });

  } catch (error) {
    console.error('ERROR:', error.message);
    return Response.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 });
  }
});