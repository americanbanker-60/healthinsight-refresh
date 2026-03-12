import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { newsletter_id } = await req.json();

    if (!newsletter_id) {
      return Response.json({ error: 'newsletter_id required' }, { status: 400 });
    }

    console.log('Processing relations for newsletter:', newsletter_id);

    // Fetch the newsletter
    const newsletters = await base44.asServiceRole.entities.NewsletterItem.filter({ id: newsletter_id });
    const newsletter = newsletters[0];

    if (!newsletter) {
      return Response.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    // Fetch all companies and topics
    const [companies, topics] = await Promise.all([
      base44.asServiceRole.entities.Company.list(),
      base44.asServiceRole.entities.Topic.list()
    ]);

    // Build searchable text from newsletter
    const searchText = [
      newsletter.title || '',
      newsletter.summary || '',
      newsletter.tldr || '',
      ...(newsletter.key_takeaways || []),
      ...(newsletter.key_players || []),
      ...(newsletter.ma_activities?.flatMap(ma => [ma.acquirer, ma.target]) || []),
      ...(newsletter.funding_rounds?.map(f => f.company) || []),
      ...(newsletter.themes?.map(t => `${t.theme} ${t.description}`) || [])
    ].join(' ').toLowerCase();

    const relations = [];

    // Match companies
    for (const company of companies) {
      let relevanceScore = 0;
      let matchType = null;

      // Check exact name match
      if (searchText.includes(company.company_name.toLowerCase())) {
        relevanceScore = 10;
        matchType = 'exact';
      }

      // Check aliases
      if (company.known_aliases && Array.isArray(company.known_aliases)) {
        for (const alias of company.known_aliases) {
          if (searchText.includes(alias.toLowerCase())) {
            relevanceScore = Math.max(relevanceScore, 9);
            matchType = matchType || 'alias';
          }
        }
      }

      // Check keywords
      if (company.primary_keywords && Array.isArray(company.primary_keywords)) {
        for (const keyword of company.primary_keywords) {
          if (searchText.includes(keyword.toLowerCase())) {
            relevanceScore = Math.max(relevanceScore, 7);
            matchType = matchType || 'keyword';
          }
        }
      }

      if (relevanceScore > 0) {
        relations.push({
          newsletter_id,
          entity_type: 'company',
          entity_id: company.id,
          entity_name: company.company_name,
          relevance_score: relevanceScore,
          match_type: matchType
        });
      }
    }

    // Match topics
    for (const topic of topics) {
      let relevanceScore = 0;
      let matchType = null;

      const topicKeywords = Array.isArray(topic.keywords) ? topic.keywords : [topic.keywords];

      for (const keyword of topicKeywords) {
        if (keyword && searchText.includes(keyword.toLowerCase())) {
          relevanceScore = Math.max(relevanceScore, 8);
          matchType = 'keyword';
        }
      }

      // Check theme matches
      if (newsletter.themes && Array.isArray(newsletter.themes)) {
        for (const theme of newsletter.themes) {
          if (theme.theme && theme.theme.toLowerCase() === topic.topic_name.toLowerCase()) {
            relevanceScore = 10;
            matchType = 'theme';
          }
        }
      }

      if (relevanceScore > 0) {
        relations.push({
          newsletter_id,
          entity_type: 'topic',
          entity_id: topic.id,
          entity_name: topic.topic_name,
          relevance_score: relevanceScore,
          match_type: matchType
        });
      }
    }

    console.log(`Found ${relations.length} relations (${relations.filter(r => r.entity_type === 'company').length} companies, ${relations.filter(r => r.entity_type === 'topic').length} topics)`);

    // Delete existing relations for this newsletter
    const existingRelations = await base44.asServiceRole.entities.NewsletterRelation.filter({ newsletter_id });
    for (const rel of existingRelations) {
      await base44.asServiceRole.entities.NewsletterRelation.delete(rel.id);
    }

    // Bulk create new relations
    if (relations.length > 0) {
      await base44.asServiceRole.entities.NewsletterRelation.bulkCreate(relations);
    }

    return Response.json({
      success: true,
      relations_created: relations.length,
      companies: relations.filter(r => r.entity_type === 'company').length,
      topics: relations.filter(r => r.entity_type === 'topic').length
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