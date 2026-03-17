import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BulkAnalysis from "../analyze/BulkAnalysis";
import { useNavigate } from "react-router-dom";
import { createPageUrl, normalizeUrl } from "@/utils";

export default function AnalyzeNewsletterForm({ sourceName, onSuccess, onCancel }) {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");
  const [analysisMode, setAnalysisMode] = useState("single");

  const analyzeNewsletter = async () => {
    if (!url.trim()) {
      setError("Please enter a newsletter URL");
      return;
    }

    setIsAnalyzing(true);
    setError("");

    const response = await base44.functions.invoke('analyzeNewsletterUrl', {
      url: normalizeUrl(url),
      sourceName: sourceName || undefined
    });

    setIsAnalyzing(false);

    const data = response?.data ?? response;
    const newsletterId = data?.id;

    if (newsletterId) {
      setIsRedirecting(true);
      onSuccess?.();
      navigate(createPageUrl("NewsletterDetail") + "?id=" + newsletterId);
    } else {
      setError(data?.error || "Analysis failed — no newsletter ID returned.");
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
                  disabled={isAnalyzing || isRedirecting}
                >
                  {isRedirecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Redirecting...
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