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
      console.log('Newsletter with this PDF already exists, skipping...');
      return Response.json({
        success: true,
        message: 'Newsletter with this PDF already exists. Skipped to prevent duplicates.',
        id: existingNewsletters[0].id,
        title: existingNewsletters[0].title
      });
    }

    // Extract structured data from PDF using LLM with file attachment
    const today = new Date().toISOString().split('T')[0];
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this healthcare newsletter/document PDF and extract key information.

Today's date is ${today}.

Extract:
- title: Clear document title
- source_name: Publication or organization name
- publication_date: Date in YYYY-MM-DD format (use today if unknown: ${today})
- tldr: 2-3 sentence executive summary
- summary: 3-4 paragraph detailed summary
- key_takeaways: 3-5 main insights as array of strings
- key_statistics: Array of notable figures with figure and context fields
- themes: Major topics as array of objects with theme and description fields
- key_players: Companies/organizations mentioned as array of strings
- ma_activities: M&A deals as array with acquirer, target, deal_value, description fields
- funding_rounds: Funding events as array with company, amount, round_type, description fields
- recommended_actions: 3-5 actionable steps as array of strings
- sentiment: Overall tone (positive/neutral/negative/mixed)
- market_sentiment: Investment sentiment (bullish/bearish/neutral/mixed)
- primary_sector: Primary healthcare sector (Urgent Care, Behavioral Health, Imaging, ASC, Physical Therapy, Dental, Home Health, Anesthesia, MSO, Telehealth, Healthcare IT, Pharmacy, Other)`,
      file_urls: [file_url],
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
            items: { type: "object", properties: { figure: { type: "string" }, context: { type: "string" } } }
          },
          themes: {
            type: "array",
            items: { type: "object", properties: { theme: { type: "string" }, description: { type: "string" } } }
          },
          key_players: { type: "array", items: { type: "string" } },
          ma_activities: {
            type: "array",
            items: { type: "object", properties: { acquirer: { type: "string" }, target: { type: "string" }, deal_value: { type: "string" }, description: { type: "string" } } }
          },
          funding_rounds: {
            type: "array",
            items: { type: "object", properties: { company: { type: "string" }, amount: { type: "string" }, round_type: { type: "string" }, description: { type: "string" } } }
          },
          recommended_actions: { type: "array", items: { type: "string" } },
          sentiment: { type: "string" },
          market_sentiment: { type: "string" },
          primary_sector: { type: "string" }
        }
      }
    });

    console.log('PDF analysis complete:', result.title);

    const newsletterData = {
      ...result,
      source_url: file_url,
      source_name: sourceName || result.source_name || 'PDF Upload',
      content_type: 'PDF',
      source_type: 'PDF',
      date_added_to_app: new Date().toISOString(),
      publication_date: result.publication_date || today,
      publication_date_confidence: 'medium',
      publication_date_source: 'PDF upload date',
      publication_date_notes: 'Direct PDF upload via admin panel',
      status: 'processing'
    };

    console.log('Creating newsletter record...');
    const createdRecord = await base44.asServiceRole.entities.NewsletterItem.create(newsletterData);
    const newsletterId = createdRecord?.id;

    if (!newsletterId) {
      console.error('Could not retrieve newsletter ID after create');
      return Response.json({ success: false, error: 'Failed to get newsletter ID' }, { status: 500 });
    }

    console.log(`Newsletter ID: ${newsletterId} — linking relations inline`);

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
    console.error('Stack:', error.stack);
    return Response.json({
      success: false,
      error: error.message || 'Unknown error occurred'
    }, { status: 500 });
  }
});