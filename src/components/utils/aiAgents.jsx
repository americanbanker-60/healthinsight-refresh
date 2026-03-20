import { securedInvokeLLM } from "./aiDefenseWrapper";
import { orchestrateAgent, createAgentConfig } from "./agentOrchestrator";
import { format } from "date-fns";

/**
 * SummaryAgent - Generates structured summaries for Explore All Sources
 */
export async function generateSummary(selectedItems, userVerbosity = "standard") {
  const config = await createAgentConfig('summary', selectedItems, {
    dateRange: "selected items",
    focus: "multi-source synthesis",
    verbosity: userVerbosity
  });
  
  return await orchestrateAgent(config);
}

/**
 * PackSummaryAgent - Generates summaries for Learning Packs
 */
export async function generatePackSummary(packItems, packTitle, userVerbosity = "standard") {
  const config = await createAgentConfig('packSummary', packItems, {
    dateRange: "pack-defined range",
    focus: packTitle,
    verbosity: userVerbosity
  });
  
  return await orchestrateAgent(config);
}

/**
 * GetSmartFastAgent - Generates quick topic briefings
 */
export async function generateGetSmartFast(topicName, relevantNewsletters) {
  const config = await createAgentConfig('getSmartFast', relevantNewsletters.slice(0, 20), {
    dateRange: "recent items",
    focus: topicName
  });
  
  return await orchestrateAgent(config);
}

/**
 * DeepDiveAgent - Generates comprehensive research briefings
 */
export async function generateDeepDive(contextTitle, relevantItems, userVerbosity = "standard") {
  const config = await createAgentConfig('deepDive', relevantItems, {
    dateRange: "comprehensive analysis period",
    focus: contextTitle,
    verbosity: userVerbosity
  });
  
  config.context.itemCount = relevantItems.length;
  
  return await orchestrateAgent(config);
}

/**
 * MarkdownFormatterAgent - Formats summaries as clean markdown for Word/PDF export
 */
export async function formatAsMarkdown(summaryContent) {
  const prompt = `SYSTEM:
You are a document formatting specialist. Format the provided content into clean, professional 
text suitable for export to Word or PDF documents.

CRITICAL FORMATTING RULES:
1. PARAGRAPHS: Use short paragraphs (2-3 sentences). Put ONE blank line between every paragraph.
2. HEADINGS: Use clear heading hierarchy. Put a blank line before AND after every heading.
3. LISTS: Put a blank line before and after every list. Each bullet on its own line.
4. SPACING: Generous spacing is essential - when in doubt, add a blank line.
5. STRUCTURE: Use sections like Overview, Key Points, Recommendations when helpful.

DO NOT:
- Create walls of text
- Use decorative separators like ==== or ****
- Join multiple bullets on the same line
- Skip blank lines between sections

USER:
Reformat the following content for Word/PDF export. Preserve all information and meaning.
Do NOT modify the actual content - only improve formatting and spacing.

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
export async function generateCustomPackSummary(itemsWithNotes, packTitle, userVerbosity = "standard") {
  const newsletters = itemsWithNotes.map(item => item.newsletter);
  
  const config = await createAgentConfig('customPack', newsletters, {
    dateRange: "user-curated items",
    focus: packTitle,
    hasUserNotes: itemsWithNotes.some(item => item.note),
    verbosity: userVerbosity
  });
  
  return await orchestrateAgent(config);
}

/**
 * CompanyOverviewAgent - Generates company overviews from newsletter mentions
 */
export async function generateCompanyOverview(companyName, relevantNewsletters) {
  const config = createAgentConfig('companyOverview', relevantNewsletters.slice(0, 15), {
    dateRange: "recent mentions",
    focus: companyName
  });
  
  return await orchestrateAgent(config);
}