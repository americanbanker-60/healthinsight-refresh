import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnalysisPreview from "../analyze/AnalysisPreview";
import BulkAnalysis from "../analyze/BulkAnalysis";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AnalyzeNewsletterForm({ sourceName, onSuccess, onCancel }) {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisMode, setAnalysisMode] = useState("single");

  const analyzeNewsletter = async () => {
    if (!url.trim()) {
      setError("Please enter a newsletter URL");
      return;
    }

    setIsAnalyzing(true);
    setError("");

    const prompt = `Analyze this healthcare newsletter and extract structured investment intelligence.

URL: ${url}

Extract the following information:
1. A brief 2-3 sentence TLDR summary
2. Key statistics with figures and context
3. Recommended actions for healthcare executives
4. Main takeaways and insights
5. Major themes with descriptions
6. M&A activities (acquirer, target, deal value, description)
7. Funding rounds (company, amount, round type, description)
8. Key players/companies mentioned
9. A comprehensive executive summary
10. Overall market sentiment (positive/neutral/negative/mixed)

Be thorough and extract all relevant details.`;

    const jsonSchema = {
      type: "object",
      properties: {
        title: { type: "string" },
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
      response_json_schema: jsonSchema
    });

    setIsAnalyzing(false);

    // Auto-save immediately after analysis
    const analysisData = { ...result, source_url: url };
    setIsSaving(true);
    try {
      const created = await base44.entities.NewsletterItem.create({
        ...analysisData,
        source_name: sourceName
      });
      navigate(createPageUrl("NewsletterDetail") + "?id=" + created.id);
      onSuccess?.();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-slate-200/60">
      <CardContent className="pt-6">
        <Tabs value={analysisMode} onValueChange={setAnalysisMode}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="single">Single Newsletter</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Enter newsletter URL..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isAnalyzing}
                  className="mb-2"
                />
                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={analyzeNewsletter}
                  className="bg-blue-600 hover:bg-blue-700 flex-1"
                  disabled={isAnalyzing || isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze Newsletter
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bulk">
            <BulkAnalysis sourceName={sourceName} onComplete={onSuccess} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}