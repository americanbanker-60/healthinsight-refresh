import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, sourceName } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url required' }, { status: 400 });
    }

    console.log('Extracting data from PDF:', file_url);

    // Extract structured data from PDF
    const extractResponse = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: file_url,
      json_schema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Newsletter or document title" },
          summary: { type: "string", description: "Executive summary or main content" },
          tldr: { type: "string", description: "Brief 2-3 sentence summary" },
          key_takeaways: {
            type: "array",
            items: { type: "string" },
            description: "Main insights and takeaways"
          },
          key_players: {
            type: "array",
            items: { type: "string" },
            description: "Important companies or organizations mentioned"
          },
          key_statistics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                figure: { type: "string" },
                context: { type: "string" }
              }
            },
            description: "Important numbers and data points"
          },
          themes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                theme: { type: "string" },
                description: { type: "string" }
              }
            },
            description: "Major themes identified"
          },
          sentiment: {
            type: "string",
            enum: ["positive", "neutral", "negative", "mixed"],
            description: "Overall tone"
          },
          market_sentiment: {
            type: "string",
            enum: ["bullish", "bearish", "neutral", "mixed"],
            description: "Investment market sentiment"
          },
          primary_sector: {
            type: "string",
            description: "Primary healthcare sector"
          }
        },
        required: ["title"]
      }
    });

    if (extractResponse.status !== "success" || !extractResponse.output) {
      throw new Error(extractResponse.details || 'Failed to extract PDF data');
    }

    console.log('PDF extraction complete:', extractResponse.output.title);

    const pdfData = extractResponse.output;

    // Check if newsletter with this file_url already exists
    const existingNewsletters = await base44.asServiceRole.entities.NewsletterItem.filter({ source_url: file_url });
    if (existingNewsletters.length > 0) {
      console.log('Newsletter with this PDF already exists, skipping...');
      return Response.json({
        success: true,
        message: 'Newsletter with this PDF already exists. Skipped to prevent duplicates.',
        title: existingNewsletters[0].title
      });
    }

    // Create newsletter record with PDF source
    const newsletterData = {
      title: pdfData.title || 'Untitled PDF',
      summary: pdfData.summary || '',
      tldr: pdfData.tldr || (pdfData.summary?.split('\n')[0] || ''),
      key_takeaways: pdfData.key_takeaways || [],
      key_players: pdfData.key_players || [],
      key_statistics: pdfData.key_statistics || [],
      themes: pdfData.themes || [],
      sentiment: pdfData.sentiment || 'neutral',
      market_sentiment: pdfData.market_sentiment || 'neutral',
      primary_sector: pdfData.primary_sector || 'Other',
      source_url: file_url,
      source_type: 'PDF',
      content_type: 'PDF',
      raw_input: pdfData.summary ? pdfData.summary.substring(0, 50000) : '',
      source_name: sourceName || 'PDF Upload',
      publication_date: new Date().toISOString().split('T')[0],
      date_added_to_app: new Date().toISOString(),
      publication_date_confidence: 'medium',
      publication_date_source: 'PDF upload date',
      publication_date_notes: 'Direct PDF upload via admin panel'
    };

    console.log('Creating newsletter record...');
    await base44.asServiceRole.entities.NewsletterItem.create(newsletterData);

    console.log('Newsletter created successfully');

    // Fetch created newsletter to get its ID
    const createdNewsletter = await base44.asServiceRole.entities.NewsletterItem.filter({ source_url: file_url });
    if (createdNewsletter[0]) {
      const newsletterId = createdNewsletter[0].id;

      // Process key_players: check/create companies and link to newsletter
      if (pdfData.key_players && pdfData.key_players.length > 0) {
        console.log('Processing key_players:', pdfData.key_players.length);
        
        for (const playerName of pdfData.key_players) {
          if (!playerName || playerName.trim().length === 0) continue;
          
          try {
            // Check if company exists
            const existingCompanies = await base44.asServiceRole.entities.Company.filter({ company_name: playerName });
            
            let companyId;
            if (existingCompanies.length > 0) {
              companyId = existingCompanies[0].id;
              console.log(`Company found: ${playerName}`);
            } else {
              // Create new company
              const newCompany = await base44.asServiceRole.entities.Company.create({
                company_name: playerName,
                primary_keywords: [playerName.toLowerCase()]
              });
              companyId = newCompany.id;
              console.log(`Company created: ${playerName}`);
            }

            // Create NewsletterRelation
            await base44.asServiceRole.entities.NewsletterItemRelation.create({
              newsletter_id: newsletterId,
              entity_type: 'company',
              entity_id: companyId,
              entity_name: playerName,
              match_type: 'exact'
            });
            console.log(`Relation created: ${playerName} -> Newsletter`);
          } catch (err) {
            console.error(`Failed to process company ${playerName}:`, err.message);
          }
        }
      }

      // Invoke createNewsletterRelations for topics in background
      base44.asServiceRole.functions.invoke('createNewsletterRelations', {
        newsletter_id: newsletterId
      }).catch(err => console.error('Background relation creation failed:', err));
    }

    return Response.json({
      success: true,
      title: pdfData.title,
      message: 'PDF analyzed and newsletter created successfully'
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