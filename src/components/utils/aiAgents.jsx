import { securedInvokeLLM } from "./aiDefenseWrapper";
import { orchestrateAgent, createAgentConfig } from "./agentOrchestrator";
import { format } from "date-fns";

/**
 * SummaryAgent - Generates structured summaries for Explore All Sources
 */
export async function generateSummary(selectedItems, userVerbosity = "standard") {
  const config = createAgentConfig('summary', selectedItems, {
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
  const config = createAgentConfig('packSummary', packItems, {
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
  const config = createAgentConfig('getSmartFast', relevantNewsletters.slice(0, 20), {
    dateRange: "recent items",
    focus: topicName
  });
  
  return await orchestrateAgent(config);
}

/**
 * DeepDiveAgent - Generates comprehensive research briefings
 */
export async function generateDeepDive(contextTitle, relevantItems, userVerbosity = "standard") {
  const config = createAgentConfig('deepDive', relevantItems, {
    dateRange: "comprehensive analysis period",
    focus: contextTitle,
    verbosity: userVerbosity
  });
  
  config.context.itemCount = relevantItems.length;
  
  return await orchestrateAgent(config);
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
export async function generateCustomPackSummary(itemsWithNotes, packTitle, userVerbosity = "standard") {
  const newsletters = itemsWithNotes.map(item => item.newsletter);
  
  const config = createAgentConfig('customPack', newsletters, {
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