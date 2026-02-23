import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check if there's an authenticated user, otherwise allow service role calls
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (e) {
      // No user authenticated - that's okay for service role calls
    }

    // Require either authenticated admin user or allow service role invocations
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { source_id } = await req.json();

    if (!source_id) {
      return Response.json({ error: 'source_id is required' }, { status: 400 });
    }

    // Get the source
    const sources = await base44.asServiceRole.entities.Source.filter({ id: source_id });
    if (!sources.length) {
      return Response.json({ error: 'Source not found' }, { status: 404 });
    }
    const source = sources[0];

    if (!source.url) {
      return Response.json({ error: 'Source has no URL configured' }, { status: 400 });
    }

    // Get existing newsletters for this source to avoid duplicates
    const existingNewsletters = await base44.asServiceRole.entities.Newsletter.filter({
      source_name: source.name
    });
    const existingUrls = new Set(existingNewsletters.map(n => n.source_url).filter(Boolean));

    // Use AI to scrape and extract newsletter data from the source
    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `
You are analyzing a healthcare newsletter source website: ${source.url}

Task: Extract the 5 most recent newsletter articles/publications from this source.

For each newsletter found, extract:
- title: The newsletter title
- source_url: Direct URL to the newsletter article
- publication_date: Publication date (YYYY-MM-DD format, estimate if not exact)
- tldr: Brief 2-3 sentence summary
- key_takeaways: Array of main insights (3-5 items)
- key_statistics: Array of important metrics with figure and context
- themes: Array of major themes (max 5), each with theme name and description
- ma_activities: Array of M&A deals mentioned
- funding_rounds: Array of funding activities mentioned
- key_players: Array of important companies/organizations mentioned
- sentiment: Overall sentiment (positive, neutral, negative, or mixed)

Only include newsletters that are NOT already in this list of existing URLs:
${Array.from(existingUrls).slice(0, 20).join('\n')}

Be thorough and accurate. If you can't find clear newsletters, return an empty array.
      `,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          newsletters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                source_url: { type: "string" },
                publication_date: { type: "string" },
                tldr: { type: "string" },
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
                ma_activities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      acquirer: { type: "string" },
                      target: { type: "string" },
                      deal_value: { type: "string" },
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
                      description: { type: "string" }
                    }
                  }
                },
                key_players: { type: "array", items: { type: "string" } },
                sentiment: { type: "string", enum: ["positive", "neutral", "negative", "mixed"] }
              },
              required: ["title", "source_url"]
            }
          }
        }
      }
    });

    const newsletters = aiResponse.newsletters || [];
    
    // Filter out any that already exist
    const newNewsletters = newsletters.filter(n => 
      n.source_url && !existingUrls.has(n.source_url)
    );

    if (newNewsletters.length === 0) {
      return Response.json({
        success: true,
        message: 'No new newsletters found',
        source_name: source.name,
        new_count: 0,
        checked_at: new Date().toISOString()
      });
    }

    // Get existing topics and companies for matching
    const existingTopics = await base44.asServiceRole.entities.Topic.list();
    const existingCompanies = await base44.asServiceRole.entities.Company.list();
    const existingCompanyNames = new Set(
      existingCompanies.flatMap(c => [
        c.company_name.toLowerCase(),
        ...(c.known_aliases || []).map(a => a.toLowerCase())
      ])
    );

    // Create newsletter records and analyze topics/companies
    const created = [];
    const topicAssignments = [];
    const newTopicSuggestions = [];
    const companiesFound = new Set();
    const companiesCreated = [];

    for (const newsletter of newNewsletters) {
      try {
        const created_newsletter = await base44.asServiceRole.entities.Newsletter.create({
          ...newsletter,
          source_name: source.name,
          key_takeaways: newsletter.key_takeaways || [],
          key_statistics: newsletter.key_statistics || [],
          themes: newsletter.themes || [],
          ma_activities: newsletter.ma_activities || [],
          funding_rounds: newsletter.funding_rounds || [],
          key_players: newsletter.key_players || [],
        });
        created.push(created_newsletter);

        // Analyze topics for this newsletter
        try {
          const topicAnalysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `
Analyze this healthcare newsletter and match it to existing topics or suggest new ones.

Newsletter:
Title: ${created_newsletter.title}
Summary: ${created_newsletter.tldr || created_newsletter.summary || ''}
Themes: ${created_newsletter.themes?.map(t => t.theme).join(', ') || 'None'}
Key Takeaways: ${created_newsletter.key_takeaways?.join(', ') || 'None'}

Existing Topics:
${existingTopics.map(t => `- ${t.topic_name}: ${t.description || ''} (keywords: ${t.keywords?.join(', ') || 'none'})`).join('\n')}

Task:
1. Find up to 3 existing topics that are highly relevant (confidence >= 70%)
2. If no good matches exist, suggest 1-2 new topics that should be created

Return matched topics with confidence scores and new topic suggestions.
            `,
            response_json_schema: {
              type: "object",
              properties: {
                matched_topics: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      topic_name: { type: "string" },
                      confidence: { type: "number" },
                      reason: { type: "string" }
                    }
                  }
                },
                new_topic_suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      topic_name: { type: "string" },
                      description: { type: "string" },
                      keywords: { type: "array", items: { type: "string" } },
                      icon: { type: "string" }
                    }
                  }
                }
              }
            }
          });

          // Record matched topics
          if (topicAnalysis.matched_topics?.length > 0) {
            topicAssignments.push({
              newsletter_id: created_newsletter.id,
              newsletter_title: created_newsletter.title,
              matched_topics: topicAnalysis.matched_topics
            });
          }

          // Create AITrendSuggestion records for new topics
          if (topicAnalysis.new_topic_suggestions?.length > 0) {
            for (const suggestion of topicAnalysis.new_topic_suggestions) {
              await base44.asServiceRole.entities.AITrendSuggestion.create({
                suggestion_type: "topic",
                title: suggestion.topic_name,
                description: suggestion.description,
                keywords: suggestion.keywords || [],
                confidence_score: 85,
                supporting_evidence: [created_newsletter.id],
                status: "new",
                icon_suggestion: suggestion.icon || "💡"
              });
              newTopicSuggestions.push(suggestion.topic_name);
            }
          }
        } catch (topicError) {
          console.error('Topic analysis error:', topicError);
        }

        // Extract and create companies
        try {
          const companyMentions = [
            ...(created_newsletter.key_players || []),
            ...(created_newsletter.ma_activities || []).flatMap(m => [m.acquirer, m.target].filter(Boolean)),
            ...(created_newsletter.funding_rounds || []).map(f => f.company).filter(Boolean)
          ];

          for (const companyName of companyMentions) {
            if (!companyName || companyName.length < 2) continue;
            
            const normalized = companyName.toLowerCase().trim();
            if (companiesFound.has(normalized) || existingCompanyNames.has(normalized)) continue;
            
            companiesFound.add(normalized);

            // Create company with AI-generated metadata
            const companyData = await base44.asServiceRole.integrations.Core.InvokeLLM({
              prompt: `
Generate metadata for this healthcare company: "${companyName}"

Context from newsletter:
${created_newsletter.title}
${created_newsletter.tldr || ''}

Return:
- company_name: Official company name
- description: 1-2 sentence description
- known_aliases: Array of common abbreviations/alternate names
- primary_keywords: Array of 3-5 keywords to track this company
              `,
              add_context_from_internet: true,
              response_json_schema: {
                type: "object",
                properties: {
                  company_name: { type: "string" },
                  description: { type: "string" },
                  known_aliases: { type: "array", items: { type: "string" } },
                  primary_keywords: { type: "array", items: { type: "string" } }
                }
              }
            });

            const newCompany = await base44.asServiceRole.entities.Company.create({
              company_name: companyData.company_name || companyName,
              description: companyData.description || '',
              known_aliases: companyData.known_aliases || [],
              primary_keywords: companyData.primary_keywords || [companyName]
            });

            companiesCreated.push(newCompany.company_name);
            existingCompanyNames.add(newCompany.company_name.toLowerCase());
          }
        } catch (companyError) {
          console.error('Company extraction error:', companyError);
        }
      } catch (error) {
        console.error('Error creating newsletter:', error);
      }
    }

    return Response.json({
      success: true,
      message: `Found and imported ${created.length} new newsletter(s), ${companiesCreated.length} new companies`,
      source_name: source.name,
      new_count: created.length,
      newsletters: created.map(n => ({ id: n.id, title: n.title })),
      topic_assignments: topicAssignments,
      new_topic_suggestions: newTopicSuggestions,
      companies_created: companiesCreated,
      checked_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scrape error:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to scrape source' 
    }, { status: 500 });
  }
});