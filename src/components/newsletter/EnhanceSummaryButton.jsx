import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EnhanceSummaryButton({ newsletter, onEnhanced }) {
  const [isEnhancing, setIsEnhancing] = useState(false);

  const enhanceSummary = async () => {
    setIsEnhancing(true);
    try {
      const prompt = `Enhance this healthcare newsletter with comprehensive summaries and insights.

Newsletter: ${newsletter.title}
Source URL: ${newsletter.source_url}
Existing TLDR: ${newsletter.tldr || "None"}
Existing Summary: ${newsletter.summary || "None"}

Generate:
1. TLDR (2-3 sentences) - concise executive summary
2. Detailed Summary (2-3 paragraphs) - comprehensive executive summary
3. Key Bullet Points (5-7 items) - main insights and takeaways
4. Key Statistics (3-5 items with figure and context)
5. Actionable Recommendations (3-5 items) - specific actions for healthcare executives

Make sure all content is insightful, actionable, and tailored for healthcare executives.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            tldr: { type: "string" },
            summary: { type: "string" },
            key_takeaways: {
              type: "array",
              items: { type: "string" }
            },
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
            recommended_actions: {
              type: "array",
              items: { type: "string" }
            }
          }
        },
        file_urls: newsletter.source_url
      });

      await base44.entities.NewsletterItem.update(newsletter.id, {
        tldr: result.tldr,
        summary: result.summary,
        key_takeaways: result.key_takeaways,
        key_statistics: result.key_statistics,
        recommended_actions: result.recommended_actions
      });

      toast.success("Newsletter enhanced with AI summaries!");
      if (onEnhanced) onEnhanced();
    } catch (error) {
      console.error("Enhancement error:", error);
      toast.error("Failed to enhance newsletter");
    }
    setIsEnhancing(false);
  };

  return (
    <Button
      onClick={enhanceSummary}
      disabled={isEnhancing}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isEnhancing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Enhancing...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          Enhance with AI
        </>
      )}
    </Button>
  );
}