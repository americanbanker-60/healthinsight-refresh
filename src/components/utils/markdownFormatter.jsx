import { base44 } from "@/api/base44Client";

/**
 * Formats a summary text into clean, professional Markdown using AI
 * @param {string} summaryContent - The raw summary content to format
 * @returns {Promise<string>} - The formatted markdown content
 */
export async function formatSummaryAsMarkdown(summaryContent) {
  if (!summaryContent) {
    throw new Error("No summary content provided");
  }

  const prompt = `SYSTEM:
Format the provided summary into clean, professional Markdown suitable for use in a memo,
email, or internal briefing. Preserve clarity and hierarchy.

USER:
Reformat the following summary into Markdown. Preserve bullets, headings, indentation, and
organization. Do NOT modify the content or add new insights.

Content to format:
${summaryContent}`;

  try {
    const formattedMarkdown = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    return formattedMarkdown;
  } catch (error) {
    console.error("Failed to format markdown:", error);
    // Fallback to original content if formatting fails
    return summaryContent;
  }
}