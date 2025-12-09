import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, ThumbsUp, ThumbsDown, Plus, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function TrendDiscovery() {
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['aiTrendSuggestions'],
    queryFn: async () => {
      const all = await base44.entities.AITrendSuggestion.list("-created_date", 20);
      // Client-side filter: only show trends with 5+ independent sources and status "new"
      return all.filter(s => {
        if (s.status !== "new") return false;
        
        const sourceCount = s.supporting_evidence?.length || 0;
        const sourceNameCount = s.source_names?.length || 0;
        
        // Must have at least 5 sources
        if (sourceCount < 5 || sourceNameCount < 5) return false;
        
        // Verify sources are distinct
        const uniqueSources = new Set(s.source_names || []);
        if (uniqueSources.size < 5) return false;
        
        return true;
      });
    },
    initialData: [],
  });

  const { data: newsletters = [] } = useQuery({
    queryKey: ['newsletters'],
    queryFn: () => base44.entities.Newsletter.list("-publication_date", 1000),
    initialData: [],
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.AITrendSuggestion.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiTrendSuggestions'] });
    },
  });

  const discoverTrends = async () => {
    setIsAnalyzing(true);
    try {
      // Clear old trend outputs only (keep all source data intact)
      const oldTrends = await base44.entities.AITrendSuggestion.list("", 1000);
      if (oldTrends.length > 0) {
        for (const trend of oldTrends) {
          await base44.entities.AITrendSuggestion.delete(trend.id);
        }
      }

      // Prepare newsletter data for AI analysis
      const recentNewsletters = newsletters.slice(0, 500);
      const newsletterSummary = recentNewsletters.map(n => ({
        id: n.id,
        title: n.title,
        source: n.source_name,
        author: n.source_name, // Track independent sources
        date: n.publication_date || n.created_date,
        themes: n.themes?.map(t => t.theme) || [],
        takeaways: n.key_takeaways || [],
        summary: n.summary || n.tldr || '',
        sentiment: n.sentiment
      }));

      const prompt = `YOU ARE THE TREND DISCOVERY ENGINE FOR THIS APPLICATION.
YOUR JOB IS TO IDENTIFY ONLY **REAL, VERIFIED TRENDS** — NOT OPINIONS, NOT ONE-OFF INSIGHTS, AND NOT SINGLE-SOURCE IDEAS.

============================================================
CRITICAL: MAXIMUM 3-5 TRENDS ONLY
============================================================
You are limited to returning a MAXIMUM of 3-5 trends total. Be extremely selective.
Quality over quantity. Only the strongest, most validated multi-source patterns.

============================================================
STRICT TREND DEFINITION (MANDATORY)
============================================================
A 'Trend' is defined as:
1. A theme, pattern, behavior, or directional shift that appears in **5 or more independent sources** (increased from 3).
2. Sources MUST come from different authors or organizations (i.e., truly independent origin - check the "source" field).
3. All sources must show **meaningful conceptual alignment**, not just shared keywords.
4. Any candidate theme with fewer than 5 independent sources MUST be excluded completely and NOT output in any form.

BEFORE OUTPUTTING ANY TREND:
- Manually verify in the data that you have 5+ DISTINCT source names
- Count them explicitly: Source 1 = X, Source 2 = Y, Source 3 = Z, Source 4 = A, Source 5 = B
- If any "source" field repeats, it does NOT count as independent
- Only proceed if you have 5+ truly different sources

============================================================
WHAT TO IGNORE (MANDATORY - EVEN MORE STRICT)
============================================================
You must not output:
- Single-source ideas (obvious)
- Two-source ideas (obvious)
- Three-source ideas (TOO FEW)
- Four-source ideas (TOO FEW)
- Editorial opinions from single publications
- Unique announcements (even if mentioned by multiple sources, if it's about ONE company's ONE event, it's not a trend)
- One-off insights
- Speculative patterns
- Broad generic themes like "AI in healthcare" or "value-based care"
- Any tier such as 'emerging trend', 'weak signal', or 'possible trend'

ONLY fully validated, multi-source trends (5+ independent sources) should be returned, and NO MORE THAN 5 TRENDS TOTAL.

============================================================
PROCESS REQUIREMENTS
============================================================
Step 1 — Pull and normalize all available source content from the newsletters data.
Step 2 — Extract candidate themes from the dataset.
Step 3 — Cluster themes by semantic similarity across ALL sources (not just by keyword).
Step 4 — Count DISTINCT INDEPENDENT sources in each cluster by checking the "source" field.
Step 5 — Automatically ELIMINATE any cluster with fewer than **5 independent sources**.
Step 6 — Rank remaining clusters by strength (number of sources × conceptual coherence).
Step 7 — Select the TOP 3-5 strongest clusters only.
Step 8 — For each selected cluster:
    - Identify the shared theme
    - Provide a clear and neutral explanation
    - List exactly which 5+ DISTINCT sources contributed (by name)
Step 9 — Output ONLY the top 3-5 validated trends, NO MORE.

============================================================
NEWSLETTERS DATA
============================================================
${JSON.stringify(newsletterSummary, null, 2)}

============================================================
OUTPUT FORMAT
============================================================
For each validated trend (MAXIMUM 3-5 trends total), provide:

1. **suggestion_type**: "learning_pack" (if time-bound research area) OR "topic" (if ongoing strategic theme)

2. **title**: 5-10 words, concise and professional (e.g., "AI-Powered Prior Authorization Platforms")

3. **description**: 2-3 sentences, strictly factual, no hype or speculation. Explain what is happening and why it matters at a high level.

4. **keywords**: 4-7 specific, searchable keywords

5. **confidence_score**: Set to 100 for all trends that meet the 5+ source threshold (since they are verified)

6. **supporting_evidence**: Array of **5 or more** newsletter IDs from independent sources that support this trend

7. **source_names**: Array of **5 or more** distinct source names (e.g., ["Elion Health", "Morning Consult", "Axios", "Healthcare Dive", "Becker's"])

8. **icon_suggestion**: Relevant emoji

9. **category**: One of: Care Models, Payor Topics, Technology, Provider Operations, Policy & Regulation

10. **strategic_implications**: 2-3 sentence summary of the strategic significance

============================================================
ERROR PREVENTION & FINAL CHECK
============================================================
You MUST NOT:
- Output more than 5 trends (3-5 is the target)
- Output any trend with fewer than 5 independent sources
- Invent sources or inflate the number of sources
- Overstate or fabricate consensus where none exists
- Combine unrelated concepts into a forced or artificial trend
- Use shallow keyword overlap as sufficient evidence
- Count the same source twice (check "source" field for duplicates)

FINAL VERIFICATION BEFORE OUTPUT:
For each trend you're about to output, ask yourself:
1. Do I have 5+ DISTINCT "source" names? (Count them)
2. Is this a genuine pattern, not a single event?
3. Is this one of the TOP 3-5 strongest patterns in the data?

If any answer is NO, DO NOT OUTPUT that trend.

If NO clusters meet the 5-source rule, return an empty trends array.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            trends: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  suggestion_type: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  keywords: { type: "array", items: { type: "string" } },
                  confidence_score: { type: "number" },
                  supporting_evidence: { type: "array", items: { type: "string" } },
                  source_names: { type: "array", items: { type: "string" } },
                  icon_suggestion: { type: "string" },
                  category: { type: "string" },
                  strategic_implications: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Validate and save trends (ensure 5+ sources minimum, max 5 trends)
      if (result.trends && result.trends.length > 0) {
        const validatedTrends = result.trends.filter(trend => {
          const sourceCount = trend.supporting_evidence?.length || 0;
          const sourceNameCount = trend.source_names?.length || 0;
          
          // Must have 5+ sources from both arrays
          if (sourceCount < 5 || sourceNameCount < 5) {
            return false;
          }
          
          // Verify sources are actually distinct (no duplicates)
          const uniqueSources = new Set(trend.source_names);
          if (uniqueSources.size < 5) {
            return false;
          }
          
          return true;
        }).slice(0, 5); // Hard cap at 5 trends maximum

        if (validatedTrends.length > 0) {
          await base44.entities.AITrendSuggestion.bulkCreate(
            validatedTrends.map(trend => ({
              ...trend,
              status: "new"
            }))
          );
          toast.success(`Discovered ${validatedTrends.length} high-confidence trend${validatedTrends.length > 1 ? 's' : ''} (5+ independent sources each)`);
          queryClient.invalidateQueries({ queryKey: ['aiTrendSuggestions'] });
        } else {
          toast.info("No qualifying trends found. Trends require 5+ independent sources.");
        }
      } else {
        toast.info("No qualifying trends found. Trends require 5+ independent sources.");
      }
    } catch (error) {
      console.error("Trend discovery error:", error);
      toast.error("Failed to discover trends");
    }
    setIsAnalyzing(false);
  };

  const acceptSuggestion = async (suggestion) => {
    try {
      if (suggestion.suggestion_type === "learning_pack") {
        await base44.entities.LearningPack.create({
          pack_title: suggestion.title,
          description: suggestion.description,
          keywords: suggestion.keywords.join(" "),
          date_range_type: "30d",
          sources_selected: [],
          topics_selected: [],
          icon: suggestion.icon_suggestion || "✨",
          category: suggestion.category || "General",
          sort_order: 999
        });
        toast.success("Learning Pack created!");
      } else {
        await base44.entities.Topic.create({
          topic_name: suggestion.title,
          description: suggestion.description,
          keywords: suggestion.keywords,
          icon: suggestion.icon_suggestion || "✨",
          sort_order: 999
        });
        toast.success("Topic created!");
      }
      
      updateStatusMutation.mutate({ id: suggestion.id, status: "accepted" });
    } catch (error) {
      toast.error("Failed to create from suggestion");
    }
  };

  const dismissSuggestion = (id) => {
    updateStatusMutation.mutate({ id, status: "dismissed" });
    toast.success("Suggestion dismissed");
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <CardTitle>AI Trend Discovery</CardTitle>
          </div>
          <Button
            onClick={discoverTrends}
            disabled={isAnalyzing || newsletters.length === 0}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Discover Trends
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-slate-600">Loading suggestions...</p>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-purple-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600 mb-4">
              No emerging trends detected yet. Click "Discover Trends" to analyze your newsletters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <Card key={suggestion.id} className="bg-white border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{suggestion.icon_suggestion || "✨"}</span>
                        <h4 className="font-semibold text-slate-900">{suggestion.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.suggestion_type === "learning_pack" ? "Learning Pack" : "Topic"}
                        </Badge>
                        <Badge className="bg-purple-100 text-purple-700 text-xs">
                          {suggestion.confidence_score}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">{suggestion.description}</p>
                      {suggestion.strategic_implications && (
                        <p className="text-xs text-purple-700 bg-purple-50 rounded px-2 py-1 mb-3 italic">
                          {suggestion.strategic_implications}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {suggestion.keywords?.slice(0, 5).map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {suggestion.category && (
                          <Badge variant="outline" className="text-xs">
                            {suggestion.category}
                          </Badge>
                        )}
                        {suggestion.source_names && suggestion.source_names.length > 0 && (
                          <span className="text-xs text-slate-500">
                            Sources: {suggestion.source_names.slice(0, 3).join(", ")}
                            {suggestion.source_names.length > 3 && ` +${suggestion.source_names.length - 3} more`}
                          </span>
                        )}
                      </div>
                      {suggestion.supporting_evidence && suggestion.supporting_evidence.length >= 5 && (
                        <div className="text-xs text-slate-500">
                          Verified across {suggestion.supporting_evidence.length} independent sources
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => acceptSuggestion(suggestion)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => dismissSuggestion(suggestion.id)}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}