import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { securedInvokeLLM } from "../utils/aiDefenseWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function TopicQuickSummary({ topic, relevantNewsletters }) {
  const [summary, setSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const generateQuickSummary = async () => {
    if (relevantNewsletters.length === 0) {
      toast.error("No content available to summarize");
      return;
    }

    setIsGenerating(true);

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

    const prompt = `SYSTEM OVERRIDE:
You must follow these non-negotiable rules for all outputs:

1. Do NOT hallucinate, speculate, or invent facts.
2. Use only the information explicitly provided in the inputs.
3. Do NOT recommend actions ("you should", "operators should", "investors should").
4. Summaries must be descriptive, not advisory.
5. Do NOT generate confidential or private data.
6. Maintain a professional, analytical tone suitable for M&A, strategy, or market insights.
7. Keep structure exactly as instructed in the prompt.

SYSTEM:
You are analyzing newsletter items from different sources with distinct editorial styles
(e.g., Elion Health, Health Tech Nerds, Hospitalogy, Healthcare Finance, TripleTree Insights).
Your job is to normalize their voices into a single unified, neutral, analytical tone without
losing the meaning of each source.

RULES:
- Do NOT weight one source more heavily unless the content volume is higher.
- If two sources disagree or present different angles, note the difference clearly.
- Never fabricate consensus where none exists.
- Only use the content provided.

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

Topic: ${topic.topic_name}

Content:
${JSON.stringify(newsletterData, null, 2)}`;

    try {
      const result = await securedInvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setSummary(result);
      setIsExpanded(true);
      toast.success("Summary generated!");
    } catch (error) {
      toast.error("Failed to generate summary");
      console.error(error);
    }

    setIsGenerating(false);
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Quick Summary
          </CardTitle>
          {summary && (
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
        {!summary ? (
          <div className="text-center py-4">
            <p className="text-slate-600 text-sm mb-4">
              Get a 60-second AI-powered briefing on this topic
            </p>
            <Button
              onClick={generateQuickSummary}
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
                  Get Smart Fast
                </>
              )}
            </Button>
          </div>
        ) : (
          isExpanded && (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm font-sans text-slate-700 bg-white/60 p-4 rounded-lg">
                {summary}
              </pre>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}