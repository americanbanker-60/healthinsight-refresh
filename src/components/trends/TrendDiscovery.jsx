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
      return all.filter(s => s.status === "new");
    },
    initialData: [],
  });

  const { data: newsletters = [] } = useQuery({
    queryKey: ['newsletters'],
    queryFn: () => base44.entities.Newsletter.list("-publication_date", 200),
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
      // Prepare newsletter data for AI analysis
      const recentNewsletters = newsletters.slice(0, 100);
      const newsletterSummary = recentNewsletters.map(n => ({
        id: n.id,
        title: n.title,
        source: n.source_name,
        date: n.publication_date || n.created_date,
        themes: n.themes?.map(t => t.theme) || [],
        takeaways: n.key_takeaways || [],
        sentiment: n.sentiment
      }));

      const prompt = `Analyze these healthcare newsletters and identify 3-5 emerging trends, topics, or themes that would make valuable Learning Packs or Topics for healthcare executives.

Newsletters data:
${JSON.stringify(newsletterSummary, null, 2)}

For each emerging trend you identify:
1. Determine if it's better as a "learning_pack" (time-bound research focus) or "topic" (ongoing subject area)
2. Create a compelling title
3. Explain why this is emerging and its significance
4. List 3-5 relevant keywords
5. Give a confidence score (0-100) based on frequency and recency
6. Suggest an emoji icon
7. Suggest a category (Care Models, Payor Topics, Technology, Provider Operations, Policy & Regulation)
8. List the newsletter IDs that support this trend

Focus on trends that:
- Are appearing with increasing frequency
- Have recent momentum
- Represent significant market shifts
- Are actionable for healthcare executives`;

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
                  icon_suggestion: { type: "string" },
                  category: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Save suggestions to database
      if (result.trends && result.trends.length > 0) {
        await base44.entities.AITrendSuggestion.bulkCreate(
          result.trends.map(trend => ({
            ...trend,
            status: "new"
          }))
        );
        toast.success(`Discovered ${result.trends.length} emerging trends!`);
        queryClient.invalidateQueries({ queryKey: ['aiTrendSuggestions'] });
      } else {
        toast.info("No new trends identified at this time");
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
        <div className="flex items-center justify-between">
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{suggestion.icon_suggestion || "✨"}</span>
                        <h4 className="font-semibold text-slate-900">{suggestion.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.suggestion_type === "learning_pack" ? "Learning Pack" : "Topic"}
                        </Badge>
                        <Badge className="bg-purple-100 text-purple-700 text-xs">
                          {suggestion.confidence_score}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{suggestion.description}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {suggestion.keywords?.slice(0, 5).map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                      {suggestion.category && (
                        <Badge variant="outline" className="text-xs">
                          {suggestion.category}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
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