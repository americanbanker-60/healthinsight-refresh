import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";

export default function AICategorySuggestion({ url, name, onSuggest }) {
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  const suggestCategory = async () => {
    if (!url && !name) return;
    
    setSuggesting(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this healthcare source and suggest the most appropriate category:

Source Name: ${name || 'Unknown'}
URL: ${url || 'Not provided'}

Categories available:
- Investment Banking (M&A, deals, healthcare finance)
- Technology (health tech, EHR, digital health)
- Finance (CFO topics, revenue cycle, financial operations)
- Operations (clinical operations, quality, efficiency)
- Policy (regulations, government, compliance)
- General (broad healthcare news)

Return ONLY valid JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            category: { 
              type: "string",
              enum: ["Investment Banking", "Technology", "Finance", "Operations", "Policy", "General"]
            },
            confidence: { type: "string" },
            reasoning: { type: "string" }
          }
        }
      });

      setSuggestion(result);
      if (onSuggest) {
        onSuggest(result.category);
      }
    } catch (error) {
      console.error("Category suggestion error:", error);
    }
    setSuggesting(false);
  };

  useEffect(() => {
    if (url || name) {
      suggestCategory();
    }
  }, [url]);

  if (!suggestion && !suggesting) return null;

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-2">
      {suggesting ? (
        <div className="flex items-center gap-2 text-sm text-purple-700">
          <Loader2 className="w-4 h-4 animate-spin" />
          AI analyzing category...
        </div>
      ) : suggestion ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-900">AI Suggestion:</span>
            <Badge className="bg-purple-600">{suggestion.category}</Badge>
            <span className="text-xs text-purple-600">({suggestion.confidence})</span>
          </div>
          <p className="text-xs text-purple-700">{suggestion.reasoning}</p>
        </div>
      ) : null}
    </div>
  );
}