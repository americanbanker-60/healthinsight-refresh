import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
// SDK version: 0.8.20

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

    // Normalize URL: lowercase + strip trailing slash
    const normalizeUrl = (u) => u.trim().toLowerCase().replace(/\/+$/, '');
    const normalizedUrl = normalizeUrl(url);
    console.log('Fetching URL:', normalizedUrl, '(normalized from:', url, ')');

    // Fetch the webpage with 45-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let htmlContent = null;
    let useFallback = false;

    try {
      const htmlResponse = await fetch(normalizedUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!htmlResponse.ok) {
        console.warn(`Fetch returned ${htmlResponse.status} ${htmlResponse.statusText} — falling back to internet browsing`);
        useFallback = true;
      } else {
        htmlContent = await htmlResponse.text();
        console.log('Fetched content length:', htmlContent.length);
        // If content is too large or suspiciously small, prefer fallback
        if (htmlContent.length > 200000 || htmlContent.length < 200) {
          console.warn(`Content length ${htmlContent.length} is out of expected range — using fallback extraction`);
          useFallback = true;
        }
      }
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      console.warn(`Fetch failed (${fetchErr.message}) — falling back to internet browsing`);
      useFallback = true;
    }

    // Extract domain for source name
    const urlObj = new URL(normalizedUrl);
    const domain = urlObj.hostname.replace('www.', '');

    console.log(`Analyzing with AI... (mode: ${useFallback ? 'internet-fallback' : 'html-content'})`);

    const today = new Date().toISOString().split('T')[0];

    const promptBody = [
      useFallback
        ? `Analyze this healthcare newsletter/article by browsing the URL directly and extract key information.\n\nURL: ${normalizedUrl}\nDomain: ${domain}`
        : `Analyze this healthcare newsletter/article and extract key information.\n\nURL: ${normalizedUrl}\nDomain: ${domain}\n\nHTML Content (truncated to first 30000 chars):\n${htmlContent.substring(0, 30000)}`,
      `\nExtract:`,
      `- title: Clear article title`,
      `- source_name: Publication name (use domain "${domain}" as fallback)`,
      `- publication_date: Date in YYYY-MM-DD format (today is ${today}, estimate based on content)`,
      `- tldr: 2-3 sentence executive summary`,
      `- summary: 3-4 paragraph detailed summary`,
      `- key_takeaways: 3-5 main points as array`,
      `- key_statistics: Array of notable figures with context (can be empty array if none)`,
      `- themes: Major topics covered (can be empty array if none)`,
      `- key_players: Companies/organizations mentioned (can be empty array if none)`,
      `- sentiment: Overall tone (positive/neutral/negative/mixed)`,
      `- market_sentiment: Investment market sentiment (bullish/bearish/neutral/mixed) - focus on financial/business implications`,
      `- deal_value: If M&A transaction mentioned, extract total value (e.g., "$500M", "undisclosed"), otherwise null`,
      `- primary_sector: Primary healthcare sector (Urgent Care, Behavioral Health, Imaging, ASC, Physical Therapy, Dental, Home Health, Anesthesia, MSO, Telehealth, Healthcare IT, Pharmacy, Other)`,
    ].join('\n');

    // Analyze with AI
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: promptBody,
      add_context_from_internet: useFallback,
      model: useFallback ? 'gemini_3_flash' : undefined,
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
      source_url: normalizedUrl,
      source_name: sourceName || result.source_name || 'Unknown Source',
      content_type: 'URL',
      raw_input: useFallback ? `[Fallback: internet browsing used] URL: ${normalizedUrl}` : htmlContent.substring(0, 60000),
      date_added_to_app: new Date().toISOString(),
      publication_date_confidence: "medium",
      publication_date_source: "AI extraction",
      publication_date_notes: useFallback ? "Fallback internet browsing used (HTML fetch failed or too large)" : "Direct URL upload via admin panel",
      status: 'processing'
    };

    console.log('AI analysis complete:', result.title);
    console.log('Creating newsletter record...');

    // Check if newsletter with this URL already exists (using normalized URL)
    const existingNewsletters = await base44.asServiceRole.entities.NewsletterItem.filter({ source_url: normalizedUrl });
    if (existingNewsletters.length > 0) {
      console.log('Newsletter with this URL already exists, skipping...');
      return Response.json({
        success: true,
        message: 'Newsletter with this URL already exists. Skipped to prevent duplicates.',
        id: existingNewsletters[0].id,
        title: existingNewsletters[0].title,
        source_name: existingNewsletters[0].source_name
      });
    }

    // Create newsletter using service role — capture returned record directly
    const createdRecord = await base44.asServiceRole.entities.NewsletterItem.create(newsletterData);
    console.log('Newsletter record created successfully');

    // Use the id from the create response directly; fall back to a filter query
    let createdNewsletter = createdRecord?.id ? [createdRecord] : await base44.asServiceRole.entities.NewsletterItem.filter({ source_url: normalizedUrl });
    if (createdNewsletter[0]) {
      const newsletterId = createdNewsletter[0].id;
      console.log(`Newsletter ID: ${newsletterId}`);

      // --- Company linking ---
      if (result.key_players && result.key_players.length > 0) {
        console.log(`[Relations] Processing ${result.key_players.length} key_players for newsletter ${newsletterId}`);

        for (const playerName of result.key_players) {
          if (!playerName || playerName.trim().length === 0) continue;

          try {
            const existingCompanies = await base44.asServiceRole.entities.Company.filter({ company_name: playerName });

            let companyId;
            if (existingCompanies.length > 0) {
              companyId = existingCompanies[0].id;
              console.log(`[Relations] Company found: "${playerName}" (id: ${companyId})`);
            } else {
              const newCompany = await base44.asServiceRole.entities.Company.create({
                company_name: playerName,
                primary_keywords: [playerName.toLowerCase()]
              });
              companyId = newCompany.id;
              console.log(`[Relations] Company created: "${playerName}" (id: ${companyId})`);
            }

            await base44.asServiceRole.entities.NewsletterRelation.create({
              newsletter_id: newsletterId,
              entity_type: 'company',
              entity_id: companyId,
              entity_name: playerName,
              match_type: 'exact'
            });
            console.log(`[Relations] Company relation saved: "${playerName}" -> newsletter ${newsletterId}`);
          } catch (err) {
            console.error(`[Relations] ERROR linking company "${playerName}" to newsletter ${newsletterId}: ${err.message}`);
          }
        }
      } else {
        console.log(`[Relations] No key_players to link for newsletter ${newsletterId}`);
      }

      // --- Topic linking ---
      if (result.themes && result.themes.length > 0) {
        console.log(`[Relations] Processing ${result.themes.length} themes for newsletter ${newsletterId}`);

        for (const themeObj of result.themes) {
          if (!themeObj || !themeObj.theme || themeObj.theme.trim().length === 0) continue;

          try {
            const themeName = themeObj.theme.trim();
            const existingTopics = await base44.asServiceRole.entities.Topic.filter({ topic_name: themeName });

            let topicId;
            if (existingTopics.length > 0) {
              topicId = existingTopics[0].id;
              console.log(`[Relations] Topic found: "${themeName}" (id: ${topicId})`);
            } else {
              const keywords = themeName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
              const newTopic = await base44.asServiceRole.entities.Topic.create({
                topic_name: themeName,
                description: themeObj.description || `Related to ${themeName}`,
                keywords: keywords.length > 0 ? keywords : [themeName.toLowerCase()]
              });
              topicId = newTopic.id;
              console.log(`[Relations] Topic created: "${themeName}" (id: ${topicId})`);
            }

            await base44.asServiceRole.entities.NewsletterRelation.create({
              newsletter_id: newsletterId,
              entity_type: 'topic',
              entity_id: topicId,
              entity_name: themeName,
              match_type: 'exact'
            });
            console.log(`[Relations] Topic relation saved: "${themeName}" -> newsletter ${newsletterId}`);
          } catch (err) {
            console.error(`[Relations] ERROR linking topic "${themeObj.theme}" to newsletter ${newsletterId}: ${err.message}`);
          }
        }
      } else {
        console.log(`[Relations] No themes to link for newsletter ${newsletterId}`);
      }

      // Background: additional relation processing
      base44.asServiceRole.functions.invoke('createNewsletterRelations', {
        newsletter_id: newsletterId
      }).catch(err => console.error(`[Relations] Background createNewsletterRelations failed: ${err.message}`));

      // Mark as completed now that all relations are linked
      await base44.asServiceRole.entities.NewsletterItem.update(newsletterId, { status: 'completed' });
      console.log(`[Status] Newsletter ${newsletterId} marked as completed`);

    } else {
      console.error('Could not retrieve created newsletter by source_url — relation linking skipped');
    }

    return Response.json({
      success: true,
      id: createdRecord?.id || createdNewsletter[0]?.id,
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