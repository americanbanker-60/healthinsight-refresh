import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, maxNewsletters = 500 } = await req.json();

    if (!query || !query.trim()) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    // Fetch a broad pool of analyzed newsletters
    const newsletters = await base44.asServiceRole.entities.Newsletter.filter(
      { is_analyzed: true },
      '-publication_date',
      maxNewsletters
    );

    // Client-side keyword pre-filter to narrow to most relevant before sending to AI
    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
    const relevant = newsletters.filter(n => {
      const text = [
        n.title || '',
        n.summary || '',
        n.tldr || '',
        ...(n.key_takeaways || []),
        ...(n.themes?.map(t => `${t.theme} ${t.description}`) || []),
        ...(n.key_players || []),
        ...(n.ma_activities?.map(a => `${a.acquirer} ${a.target} ${a.description}`) || []),
        ...(n.funding_rounds?.map(f => `${f.company} ${f.description}`) || []),
      ].join(' ').toLowerCase();
      return keywords.some(k => text.includes(k));
    });

    // Use top 30 most relevant for AI synthesis
    const topRelevant = relevant.slice(0, 30);

    // Build context for LLM
    const context = topRelevant.map((n, i) =>
      `[${i + 1}] ${n.title} (${n.source_name}, ${n.publication_date || 'no date'})
Summary: ${n.tldr || n.summary || 'N/A'}
Key Takeaways: ${(n.key_takeaways || []).slice(0, 3).join(' | ')}
M&A: ${(n.ma_activities || []).map(a => `${a.acquirer} → ${a.target} (${a.deal_value || 'undisclosed'})`).join(', ') || 'None'}
Funding: ${(n.funding_rounds || []).map(f => `${f.company} ${f.amount} ${f.round_type || ''}`).join(', ') || 'None'}
Key Players: ${(n.key_players || []).slice(0, 5).join(', ') || 'N/A'}`
    ).join('\n\n---\n\n');

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a healthcare M&A intelligence analyst. A user searched for: "${query}"

Based on the following ${topRelevant.length} newsletters from a database of ${newsletters.length} total, provide a structured intelligence answer.

NEWSLETTERS:
${context}

Respond with:
1. A direct 2-3 sentence answer to the query
2. Key findings (3-5 bullet points with specific data, companies, deal values where available)
3. Notable companies/players mentioned
4. Any M&A or funding activity relevant to the query
5. A brief "What to watch" forward-looking note

Be specific, cite source names and dates where relevant. Do not hallucinate — only use information from the provided newsletters.`,
      response_json_schema: {
        type: 'object',
        properties: {
          direct_answer: { type: 'string' },
          key_findings: { type: 'array', items: { type: 'string' } },
          notable_players: { type: 'array', items: { type: 'string' } },
          ma_and_funding: { type: 'array', items: { type: 'string' } },
          what_to_watch: { type: 'string' },
        }
      }
    });

    return Response.json({
      success: true,
      query,
      total_searched: newsletters.length,
      relevant_found: relevant.length,
      ai_synthesis: aiResponse,
      matched_newsletters: topRelevant.map(n => ({
        id: n.id,
        title: n.title,
        source_name: n.source_name,
        publication_date: n.publication_date,
        tldr: n.tldr,
        sentiment: n.sentiment,
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});