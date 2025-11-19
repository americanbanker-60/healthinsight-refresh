import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function CompanyOverview({ company, relevantNewsletters }) {
  const [overview, setOverview] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const generateOverview = async () => {
    if (relevantNewsletters.length === 0) {
      toast.error("No content available to generate overview");
      return;
    }

    setIsGenerating(true);

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

    const prompt = `SYSTEM OVERRIDE:
You must follow these non-negotiable rules for all outputs:

1. Do NOT hallucinate, speculate, or invent facts.
2. Use only the information explicitly provided in the inputs.
3. Do NOT recommend actions or provide advisory guidance.
4. Summaries must be descriptive, not advisory.
5. Do NOT generate confidential or private data.
6. Maintain a professional, analytical tone suitable for market intelligence.

You are creating a brief company intelligence overview based solely on newsletter mentions.

USER:
Create a concise company overview (3-4 paragraphs) covering:

1. **What the company does** - Based on how they're described in the content
2. **Recent activity** - Major news, launches, deals, or strategic moves mentioned
3. **Market presence** - How they're positioned or discussed in healthcare industry coverage

Company: ${company.company_name}

Content referencing this company:
${JSON.stringify(newsletterData, null, 2)}`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setOverview(result);
      setIsExpanded(true);
      toast.success("Overview generated!");
    } catch (error) {
      toast.error("Failed to generate overview");
      console.error(error);
    }

    setIsGenerating(false);
  };

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Company Overview
          </CardTitle>
          {overview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!overview ? (
          <div className="text-center py-4">
            <p className="text-slate-600 text-sm mb-4">
              Generate an AI-powered overview based on newsletter mentions
            </p>
            <Button
              onClick={generateOverview}
              disabled={isGenerating}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Overview
                </>
              )}
            </Button>
          </div>
        ) : (
          isExpanded && (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm font-sans text-slate-700 bg-white/60 p-4 rounded-lg">
                {overview}
              </pre>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}