import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, Sparkles, Globe, CheckCircle2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import AnalysisPreview from "../components/analyze/AnalysisPreview";

export default function VariousSources() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);

  const analyzeNewsletter = async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    setIsAnalyzing(true);
    setError("");

    try {
      const prompt = `Analyze this healthcare newsletter/article and extract structured investment intelligence.

URL: ${url}

Extract the following information:
1. The title of the article/newsletter
2. A brief 2-3 sentence TLDR summary
3. Key statistics with figures and context
4. Recommended actions for healthcare executives
5. Main takeaways and insights
6. Major themes with descriptions
7. M&A activities (acquirer, target, deal value, description)
8. Funding rounds (company, amount, round type, description)
9. Key players/companies mentioned
10. A comprehensive executive summary
11. Overall market sentiment (positive/neutral/negative/mixed)
12. The source name (publisher/website name)
13. The publication date if available

Be thorough and extract all relevant details.`;

      const jsonSchema = {
        type: "object",
        properties: {
          title: { type: "string" },
          source_name: { type: "string" },
          tldr: { type: "string" },
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
          },
          key_takeaways: {
            type: "array",
            items: { type: "string" }
          },
          themes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                theme: { type: "string" },
                description: { type: "string" }
              }
            }
          },
          ma_activities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                acquirer: { type: "string" },
                target: { type: "string" },
                deal_value: { type: "string" },
                description: { type: "string" }
              }
            }
          },
          funding_rounds: {
            type: "array",
            items: {
              type: "object",
              properties: {
                company: { type: "string" },
                amount: { type: "string" },
                round_type: { type: "string" },
                description: { type: "string" }
              }
            }
          },
          key_players: {
            type: "array",
            items: { type: "string" }
          },
          summary: { type: "string" },
          sentiment: {
            type: "string",
            enum: ["positive", "neutral", "negative", "mixed"]
          },
          publication_date: { type: "string" }
        }
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: jsonSchema,
        file_urls: url
      });

      setAnalysisResult({ ...result, source_url: url });
    } catch (err) {
      setError("Failed to analyze URL. Please check the URL and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveNewsletter = async () => {
    try {
      await base44.entities.Newsletter.create({
        ...analysisResult,
        source_name: analysisResult.source_name || "Various Sources"
      });
      queryClient.invalidateQueries({ queryKey: ['all-newsletters'] });
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      toast.success("Newsletter saved successfully!");
      setAnalysisResult(null);
      setUrl("");
    } catch (err) {
      toast.error("Failed to save newsletter");
    }
  };

  const resetForm = () => {
    setAnalysisResult(null);
    setUrl("");
    setError("");
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center">
            <Globe className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Various Sources</h1>
            <p className="text-slate-600 text-lg mt-1">
              Analyze any healthcare article or newsletter by URL
            </p>
          </div>
        </div>
      </div>

      {analysisResult ? (
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-slate-200/60">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <CardTitle className="text-lg">Analysis Complete</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <AnalysisPreview analysis={analysisResult} onSave={saveNewsletter} />
            <Button variant="outline" onClick={resetForm} className="mt-4">
              Analyze Another URL
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-slate-200/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-indigo-600" />
              Paste a URL to Analyze
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                placeholder="https://example.com/healthcare-article..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError("");
                }}
                disabled={isAnalyzing}
                className="text-base"
              />
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>

            <Button
              onClick={analyzeNewsletter}
              disabled={isAnalyzing || !url.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing URL...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze URL
                </>
              )}
            </Button>

            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-700 mb-2">Tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Paste any healthcare newsletter, article, or blog URL</li>
                <li>The AI will extract key insights, statistics, and themes</li>
                <li>Review the analysis before saving to your library</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}