import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all active sources
    const sources = await base44.asServiceRole.entities.Source.list("name");
    const activeSources = sources.filter(s => !s.is_deleted);

    if (activeSources.length === 0) {
      return Response.json({ success: true, topicsCreated: 0, message: 'No active sources found' });
    }

    // Fetch existing topics to avoid duplicates
    const existingTopics = await base44.asServiceRole.entities.Topic.list("topic_name");
    const existingTopicNames = new Set(existingTopics.map(t => t.topic_name));

    // Use LLM to generate topic suggestions from source names and descriptions
    const sourceDescriptions = activeSources
      .map(s => `${s.name}: ${s.description || 'No description'}`)
      .join('\n');

    const prompt = `Analyze these healthcare newsletter sources and generate 8-12 key topics that would help users explore and organize content:

${sourceDescriptions}

Return a JSON array with objects containing:
- topic_name (short, clear name)
- description (1-2 sentences)
- keywords (array of 3-5 relevant search terms)
- icon (single relevant emoji)

Focus on healthcare business topics like: Value-Based Care, M&A Activity, Technology Innovation, Policy & Regulation, Provider Operations, Payor Strategy, etc.

Return ONLY valid JSON array, no other text.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          topics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                topic_name: { type: 'string' },
                description: { type: 'string' },
                keywords: { type: 'array', items: { type: 'string' } },
                icon: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const suggestedTopics = result.topics || [];
    const topicsToCreate = suggestedTopics.filter(t => !existingTopicNames.has(t.topic_name));

    if (topicsToCreate.length === 0) {
      return Response.json({ success: true, topicsCreated: 0, message: 'All suggested topics already exist' });
    }

    // Add sort_order and create topics
    const topicsWithOrder = topicsToCreate.map((t, idx) => ({
      topic_name: t.topic_name,
      description: t.description,
      keywords: t.keywords,
      icon: t.icon,
      sort_order: existingTopics.length + idx
    }));

    await base44.asServiceRole.entities.Topic.bulkCreate(topicsWithOrder);

    return Response.json({
      success: true,
      topicsCreated: topicsWithOrder.length,
      topics: topicsWithOrder.map(t => t.topic_name)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});