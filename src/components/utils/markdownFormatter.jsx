import { formatAsMarkdown } from "./aiAgents";

/**
 * Formats a summary text into clean, professional Markdown using AI
 * @param {string} summaryContent - The raw summary content to format
 * @returns {Promise<string>} - The formatted markdown content
 */
export async function formatSummaryAsMarkdown(summaryContent) {
  if (!summaryContent) {
    throw new Error("No summary content provided");
  }

  try {
    return await formatAsMarkdown(summaryContent);
  } catch (error) {
    console.error("Failed to format markdown:", error);
    // Fallback to original content if formatting fails
    return summaryContent;
  }
}