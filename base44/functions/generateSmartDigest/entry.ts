import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Support both direct calls (with newsletter_id) and entity automation payloads
  const body = await req.json();
  const newsletterId = body.newsletter_id || body.event?.entity_id;

  if (!newsletterId) {
    return Response.json({ error: 'newsletter_id is required' }, { status: 400 });
  }

  // Fetch the newsletter
  const newsletters = await base44.asServiceRole.entities.NewsletterItem.filter({ id: newsletterId });
  const newsletter = newsletters[0];

  if (!newsletter) {
    return Response.json({ error: 'Newsletter not found' }, { status: 404 });
  }

  // Skip if already has a digest and was generated recently (within 24h)
  if (newsletter.smart_digest_bullets?.length > 0 && newsletter.smart_digest_generated_at) {
    const generated = new Date(newsletter.smart_digest_generated_at);
    const hoursSince = (Date.now() - generated.getTime()) / 1000 / 60 / 60;
    if (hoursSince < 24) {
      return Response.json({ message: 'Digest already up to date', skipped: true });
    }
  }

  // Build context from existing analyzed data
  const context = [
    newsletter.tldr && `TL;DR: ${newsletter.tldr}`,
    newsletter.summary && `Summary: ${newsletter.summary}`,
    newsletter.key_takeaways?.length && `Key Takeaways: ${newsletter.key_takeaways.slice(0, 5).join(' | ')}`,
    newsletter.ma_activities?.length && `M&A: ${newsletter.ma_activities.map(m => `${m.acquirer} acquired ${m.target}${m.deal_value ? ' for ' + m.deal_value : ''}`).join('; ')}`,
    newsletter.funding_rounds?.length && `Funding: ${newsletter.funding_rounds.map(f => `${f.company} raised ${f.amount} (${f.round_type})`).join('; ')}`,
    newsletter.themes?.length && `Themes: ${newsletter.themes.map(t => t.theme).join(', ')}`,
    newsletter.key_players?.length && `Key Players: ${newsletter.key_players.slice(0, 8).join(', ')}`,
  ].filter(Boolean).join('\n');

  if (!context.trim()) {
    return Response.json({ message: 'Insufficient content to generate digest', skipped: true });
  }

  const rawResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are a senior healthcare investment banking analyst. Based on this newsletter intelligence, generate exactly 3 concise executive summary bullets for an investment professional audience.

Newsletter: "${newsletter.title}" (${newsletter.source_name})

Intelligence:
${context}

Requirements:
- Exactly 3 bullets
- Each bullet max 20 words
- Focus on deal activity, market signals, and strategic implications
- Investment banking quality — no fluff, high signal
- Do NOT start bullets with "•" or "-"

Also determine the Deal Sentiment from one of: bullish, bearish, neutral, mixed
Base sentiment on: deal volume, funding activity, market tone, and strategic signals present.

Return JSON only:
{
  "bullets": ["bullet 1", "bullet 2", "bullet 3"],
  "deal_sentiment": "bullish|bearish|neutral|mixed"
}`,
    response_json_schema: {
      type: "object",
      properties: {
        bullets: { type: "array", items: { type: "string" } },
        deal_sentiment: { type: "string" }
      }
    }
  });

  const result = rawResult?.response || rawResult;
  const bullets = result?.bullets?.slice(0, 3) || [];
  const dealSentiment = result?.deal_sentiment || 'neutral';

  // Save back to the newsletter
  await base44.asServiceRole.entities.NewsletterItem.update(newsletterId, {
    smart_digest_bullets: bullets,
    market_sentiment: dealSentiment,
    smart_digest_generated_at: new Date().toISOString()
  });

  return Response.json({ success: true, bullets, deal_sentiment: dealSentiment });
});