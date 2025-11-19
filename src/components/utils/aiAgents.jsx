import { securedInvokeLLM } from "./aiDefenseWrapper";
import { format } from "date-fns";

/**
 * SummaryAgent - Generates structured summaries for Explore All Sources
 */
export async function generateSummary(selectedItems) {
  const newsletterData = selectedItems.map(n => {
    const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
    return {
      title: n.title,
      source: n.source_name,
      date: format(pubDate, "MMM d, yyyy"),
      summary: n.tldr || n.summary || "No summary available",
      key_takeaways: n.key_takeaways || [],
      themes: n.themes?.map(t => t.theme) || [],
      ma_activities: n.ma_activities || [],
      funding_rounds: n.funding_rounds || [],
      key_statistics: n.key_statistics || []
    };
  });

  const prompt = `SYSTEM:
You are a healthcare strategy analyst summarizing multiple newsletter excerpts.
Your job is to synthesize themes, trends, and insights across the provided items.
Do NOT hallucinate, speculate, or introduce unverified claims. Only use the content given.
Keep the writing crisp, concise, and business-oriented.

USER:
Summarize the following newsletter items as if preparing briefing notes for a 
healthcare strategy meeting. The output must follow this structure:

1. **TL;DR (5–10 bullets)**
   - Concise, actionable, and theme-based points.
   - No fluff or generic statements.

2. **Key Themes**
   - 3–5 themes that appear across multiple items.
   - Include 1–2 sentences per theme with examples drawn from the content.

3. **Notable Points & Signals**
   - Important stats, policy shifts, deal activity, product launches, or payer/provider moves.
   - Only include verifiable information provided in the inputs.

4. **Source Notes (Optional)**
   - 1–2 bullets per source summarizing what that source emphasized.
   - Only include sources that appear in the input items.

5. **If You Only Read One…**
   - Identify the single most informative item and explain why in one sentence.

Here are the newsletter items to analyze:
${JSON.stringify(newsletterData, null, 2)}`;

  return await securedInvokeLLM({ prompt, add_context_from_internet: false });
}

/**
 * PackSummaryAgent - Generates summaries for Learning Packs
 */
export async function generatePackSummary(packItems, packTitle) {
  const newsletterData = packItems.map(n => {
    const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
    return {
      title: n.title,
      source: n.source_name,
      date: format(pubDate, "MMM d, yyyy"),
      summary: n.tldr || n.summary || "No summary available",
      key_takeaways: n.key_takeaways || [],
      themes: n.themes?.map(t => t.theme) || [],
      ma_activities: n.ma_activities || [],
      funding_rounds: n.funding_rounds || [],
      key_statistics: n.key_statistics || []
    };
  });

  const prompt = `SYSTEM:
You are a healthcare market intelligence analyst. Your task is to summarize and synthesize
all items contained in a Learning Pack. Focus on clarity and pattern recognition.
Do NOT guess or add content not present in the inputs.

USER:
Provide a high-level synthesis of the Learning Pack contents using this structure:

1. **Executive Summary (4–6 sentences)**
   - Explain the core theme of the Pack.
   - Highlight the major insights contained across the curated items.

2. **Key Drivers & Trends**
   - 3–6 trends shaping this topic.
   - Keep each trend to 2–3 sentences.

3. **What Matters for Operators / Payors / Investors**
   - Provide a short bullet section identifying implications.
   - This must be descriptive, not advisory. ("The content suggests…", not "You should…")

4. **Notable News & Events**
   - Bullet list of major events, policy changes, launches, partnerships, or analytics.
   - Only include items mentioned in the input.

5. **Terminology & Concepts (Optional)**
   - Define any key terms mentioned repeatedly.

Learning Pack: ${packTitle}

Learning Pack contents:
${JSON.stringify(newsletterData, null, 2)}`;

  return await securedInvokeLLM({ prompt, add_context_from_internet: false });
}

/**
 * GetSmartFastAgent - Generates quick topic briefings
 */
export async function generateGetSmartFast(topicName, relevantNewsletters) {
  const newsletterData = relevantNewsletters.slice(0, 20).map(n => {
    const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
    return {
      title: n.title,
      source: n.source_name,
      date: format(pubDate, "MMM d, yyyy"),
      summary: n.tldr || n.summary || "No summary available",
      key_takeaways: n.key_takeaways || [],
      themes: n.themes?.map(t => t.theme) || [],
      ma_activities: n.ma_activities || [],
      funding_rounds: n.funding_rounds || [],
      key_statistics: n.key_statistics || []
    };
  });

  const prompt = `SYSTEM:
You are a healthcare insights analyst tasked with producing a 60-second briefing on a topic.
The goal is to help a busy professional quickly understand the state of the topic based
solely on the provided content. No speculation, no unsupported claims.

USER:
Create a short "Get Smart Fast" briefing with the following structure:

1. **What This Topic Is About (2–3 sentences)**
   - Plain, direct description of the topic using inputs only.

2. **Current Landscape (4–6 bullets)**
   - Capture what's happening now according to the inputs.

3. **Key Forces & Pressures (3–5 bullets)**
   - Policy, operational, payer, provider, or market dynamics.
   - Must be grounded in the input content.

4. **Recent Highlights (5–10 bullets)**
   - News, stats, regulatory notes, deals, product releases, payer updates.

5. **Reading Priority**
   - Identify the two most relevant items to start with (from inputs) and explain why.

Topic: ${topicName}

Content:
${JSON.stringify(newsletterData, null, 2)}`;

  return await securedInvokeLLM({ prompt, add_context_from_internet: false });
}

/**
 * DeepDiveAgent - Generates comprehensive research briefings
 */
export async function generateDeepDive(contextTitle, relevantItems) {
  const newsletterData = relevantItems.map(n => {
    const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
    return {
      title: n.title,
      source: n.source_name,
      date: format(pubDate, "MMM d, yyyy"),
      summary: n.tldr || n.summary || "",
      key_takeaways: n.key_takeaways || [],
      key_statistics: n.key_statistics || [],
      themes: n.themes || [],
      ma_activities: n.ma_activities || [],
      funding_rounds: n.funding_rounds || [],
      key_players: n.key_players || []
    };
  });

  const prompt = `SYSTEM:
You are a healthcare market research analyst creating a structured deep-dive briefing
based solely on the provided content. Do NOT speculate or hallucinate.

USER:
Create a deep-dive research briefing on the following topic using only the provided 
newsletter items and pack content.

Follow this exact structure:

1. **Executive Summary** (5–8 sentences)
2. **Market Overview** (explain the current state and context)
3. **Key Drivers & Forces** (5–8 bullets)
4. **Landscape Map** (Payors, Providers, Vendors — bullets only)
5. **Recent Timeline** (chronological, 90–180 days)
6. **Major News Highlights** (10–20 bullets)
7. **Most Important Excerpts**
   - Include 5 excerpts with source + date
8. **Consolidated Summary** (4–6 sentences)

Topic: ${contextTitle}

Content:
${JSON.stringify(newsletterData, null, 2)}`;

  return await securedInvokeLLM({ prompt, add_context_from_internet: false });
}

/**
 * MarkdownFormatterAgent - Formats summaries as clean markdown
 */
export async function formatAsMarkdown(summaryContent) {
  const prompt = `SYSTEM:
Format the provided summary into clean, professional Markdown suitable for use in a memo,
email, or internal briefing. Preserve clarity and hierarchy.

USER:
Reformat the following summary into Markdown. Preserve bullets, headings, indentation, and
organization. Do NOT modify the content or add new insights.

Content to format:
${summaryContent}`;

  return await securedInvokeLLM({ prompt, add_context_from_internet: false });
}

/**
 * InsightsNarrativeAgent - Generates narrative for My Library Insights
 */
export async function generateInsightsNarrative(insightsData) {
  const prompt = `SYSTEM:
You are a neutral, descriptive healthcare analytics narrator. You describe user activity
patterns without giving advice.

USER:
Using ONLY the provided activity statistics (topics, top packs, sources, counts), write
a short 2–5 sentence narrative describing what the user has been focusing on recently.
Do NOT recommend actions. Do NOT reference data that is not present.

Activity data:
${JSON.stringify(insightsData, null, 2)}`;

  return await securedInvokeLLM({ prompt, add_context_from_internet: false });
}

/**
 * CustomPackSummaryAgent - Generates summaries for custom packs with user notes
 */
export async function generateCustomPackSummary(itemsWithNotes, packTitle) {
  const newsletterData = itemsWithNotes.map(item => {
    const n = item.newsletter;
    const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
    return {
      title: n.title,
      source: n.source_name,
      date: format(pubDate, "MMM d, yyyy"),
      summary: n.tldr || n.summary || "No summary available",
      key_takeaways: n.key_takeaways || [],
      note: item.note || null
    };
  });

  const prompt = `SYSTEM:
You are a healthcare market intelligence analyst. Your task is to summarize and synthesize
all items contained in a custom intelligence pack. Focus on clarity and pattern recognition.
Do NOT guess or add content not present in the inputs.

USER:
Create a synthesis of this Custom Pack with the following structure:

1. **Executive Summary (4–6 sentences)**
   - Explain the themes across the curated items.

2. **Key Insights**
   - 3–6 major insights from the content.

3. **Notable Highlights**
   - Important events, deals, trends, or data points.

4. **User Context** (if notes are present)
   - Incorporate any user notes that explain why items were selected.

Custom Pack: ${packTitle}

Content:
${JSON.stringify(newsletterData, null, 2)}`;

  return await securedInvokeLLM({ prompt, add_context_from_internet: false });
}

/**
 * CompanyOverviewAgent - Generates company overviews from newsletter mentions
 */
export async function generateCompanyOverview(companyName, relevantNewsletters) {
  const newsletterData = relevantNewsletters.slice(0, 15).map(n => {
    const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
    return {
      title: n.title,
      source: n.source_name,
      date: format(pubDate, "MMM d, yyyy"),
      summary: n.tldr || n.summary || "No summary available",
      key_takeaways: n.key_takeaways || [],
      ma_activities: n.ma_activities || [],
      funding_rounds: n.funding_rounds || [],
      key_players: n.key_players || []
    };
  });

  const prompt = `SYSTEM:
You are creating a brief company intelligence overview based solely on newsletter mentions.
Do NOT hallucinate, speculate, or invent facts.

USER:
Create a concise company overview (3-4 paragraphs) covering:

1. **What the company does** - Based on how they're described in the content
2. **Recent activity** - Major news, launches, deals, or strategic moves mentioned
3. **Market presence** - How they're positioned or discussed in healthcare industry coverage

Company: ${companyName}

Content referencing this company:
${JSON.stringify(newsletterData, null, 2)}`;

  return await securedInvokeLLM({ prompt, add_context_from_internet: false });
}