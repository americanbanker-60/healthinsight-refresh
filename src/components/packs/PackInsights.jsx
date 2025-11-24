import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";

export default function PackInsights({ pack, newsletters, onInsightsGenerated }) {
  const [generating, setGenerating] = useState(false);

  const generateInsights = async () => {
    setGenerating(true);
    try {
      const contentSummary = newsletters.map(n => ({
        title: n.title,
        tldr: n.tldr,
        themes: n.themes?.map(t => t.theme).join(", "),
        key_takeaways: n.key_takeaways?.slice(0, 3)
      }));

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this Learning Pack titled "${pack.pack_title}" which contains ${newsletters.length} newsletters.
        
Description: ${pack.description}

Generate a comprehensive pack-level insight that includes:
1. Overarching themes and trends across all content
2. Key insights that emerge when viewing these articles together
3. Strategic implications for healthcare executives
4. Evolution of topics over time if applicable

Newsletter summaries:
${JSON.stringify(contentSummary, null, 2)}

Provide a well-structured markdown analysis (200-300 words).`,
        response_json_schema: null
      });

      await base44.entities.LearningPack.update(pack.id, {
        pack_insights: response,
        insights_generated_at: new Date().toISOString()
      });

      toast.success("Pack insights generated successfully");
      if (onInsightsGenerated) onInsightsGenerated();
    } catch (error) {
      toast.error("Failed to generate insights: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  if (!pack.pack_insights) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="pt-6 text-center">
          <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-900 mb-2">AI Pack Insights</h3>
          <p className="text-sm text-slate-600 mb-4">
            Generate comprehensive insights across all {newsletters.length} articles in this pack
          </p>
          <Button onClick={generateInsights} disabled={generating || newsletters.length === 0}>
            <Sparkles className="w-4 h-4 mr-2" />
            {generating ? "Generating..." : "Generate Insights"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Pack Insights
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={generateInsights} disabled={generating}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
        {pack.insights_generated_at && (
          <p className="text-xs text-slate-500">
            Generated {format(new Date(pack.insights_generated_at), "MMM d, yyyy")}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm prose-slate max-w-none">
          <ReactMarkdown>{pack.pack_insights}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}