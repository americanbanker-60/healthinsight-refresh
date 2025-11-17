import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Link2, Sparkles, AlertCircle, ArrowLeft, Loader2, ListTree } from "lucide-react";
import { motion } from "framer-motion";
import AnalysisPreview from "../components/analyze/AnalysisPreview";
import BulkAnalysis from "../components/analyze/BulkAnalysis";

export default function AnalyzeNewsletter() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [mode, setMode] = useState("single");

  const analyzeNewsletter = async () => {
    if (!url.trim()) {
      setError("Please enter a valid URL");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this healthcare newsletter from ${url} and extract structured insights. Focus on:
1. Key takeaways and main points
2. Major themes and topics
3. M&A activities (mergers, acquisitions, deals)
4. Funding rounds and investments
5. Key players (companies, organizations)
6. Overall market sentiment
7. Executive summary

Extract detailed information about the healthcare industry developments mentioned in this newsletter.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            publication_date: { type: "string" },
            key_takeaways: { type: "array", items: { type: "string" } },
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
            key_players: { type: "array", items: { type: "string" } },
            summary: { type: "string" },
            sentiment: { type: "string", enum: ["positive", "neutral", "negative", "mixed"] }
          }
        }
      });

      setAnalysisResult({ ...result, source_url: url });
    } catch (err) {
      setError("Error analyzing newsletter. Please try again.");
      console.error(err);
    }
    
    setIsAnalyzing(false);
  };

  const saveNewsletter = async () => {
    await base44.entities.Newsletter.create(analysisResult);
    navigate(createPageUrl("Dashboard"));
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl("Dashboard"))}
          className="mb-4 hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Analyze Newsletter</h1>
        <p className="text-slate-600 text-lg">Extract insights from healthcare industry newsletters using AI</p>
      </div>

      {!analysisResult ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-slate-200/60">
            <CardHeader className="border-b border-slate-200/60 pb-6">
              <Tabs value={mode} onValueChange={setMode}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="single" className="flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Single Newsletter
                  </TabsTrigger>
                  <TabsTrigger value="bulk" className="flex items-center gap-2">
                    <ListTree className="w-4 h-4" />
                    Crawl Newsletter Source
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="pt-6">
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {mode === "single" ? (
                <div className="space-y-6">
                  <div>
                    <Input
                      placeholder="https://example.com/healthcare-newsletter"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="h-14 text-lg border-slate-300 focus:border-blue-500"
                      disabled={isAnalyzing}
                    />
                    <p className="text-sm text-slate-500 mt-2">
                      Paste the URL of any healthcare newsletter to extract insights
                    </p>
                  </div>

                  <Button
                    onClick={analyzeNewsletter}
                    disabled={isAnalyzing || !url.trim()}
                    className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing Newsletter...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Analyze with AI
                      </>
                    )}
                  </Button>

                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                    <h3 className="font-semibold text-slate-900 mb-3">What we'll extract:</h3>
                    <ul className="space-y-2 text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>Key takeaways and main insights</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>Major themes and trending topics</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>M&A activities and deal details</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>Funding rounds and investment activity</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>Key players and organizations</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>Market sentiment analysis</span>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <BulkAnalysis />
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <AnalysisPreview analysis={analysisResult} onSave={saveNewsletter} />
      )}
    </div>
  );
}