import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle, Sparkles, Globe, CheckCircle2, Link as LinkIcon, FileUp, File } from "lucide-react";
import { toast } from "sonner";
import AnalysisPreview from "../components/analyze/AnalysisPreview";

export default function VariousSources() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [activeTab, setActiveTab] = useState("url");
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isPdf = selectedFile.type === "application/pdf" || selectedFile.name?.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        setError("Please upload a PDF file");
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  const analyzeNewsletter = async () => {
    if (activeTab === "url" && !url.trim()) {
      setError("Please enter a URL");
      return;
    }
    if (activeTab === "pdf" && !file) {
      setError("Please upload a PDF file");
      return;
    }

    setIsAnalyzing(true);
    setError("");

    try {
      let fileUrl = null;
      
      if (activeTab === "pdf" && file) {
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        fileUrl = uploadResult.file_url;
        if (!fileUrl) {
          setError("Failed to upload file. Please try again.");
          setIsAnalyzing(false);
          return;
        }
      }

      const prompt = `Analyze this healthcare newsletter/article and extract structured investment intelligence.

${activeTab === "url" ? `URL: ${url}` : "Analyze the attached PDF document."}

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

      const llmParams = {
        prompt,
        response_json_schema: jsonSchema,
      };

      if (activeTab === "url") {
        llmParams.add_context_from_internet = true;
      } else if (fileUrl) {
        llmParams.file_urls = [fileUrl];
      }

      const result = await base44.integrations.Core.InvokeLLM(llmParams);

      const fileName = file?.name ? file.name.replace(/\.pdf$/i, "") : "Additional Publishers";
      
      setAnalysisResult({ 
        ...result, 
        source_url: activeTab === "url" ? url : fileUrl,
        source_name: result.source_name || (activeTab === "pdf" ? fileName : "Additional Publishers")
      });
    } catch (err) {
      setError("Failed to analyze. Please check your input and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveNewsletter = async () => {
    try {
      const sourceName = analysisResult.source_name?.trim() || "Additional Publishers";
      const dataToSave = { ...analysisResult, source_name: sourceName };

      // Check for duplicate
      if (dataToSave.source_url) {
        const existing = await base44.entities.NewsletterItem.filter({ source_url: dataToSave.source_url });
        if (existing.length > 0) {
          toast.info("This article is already in your library.");
          setAnalysisResult(null);
          setUrl("");
          setFile(null);
          return;
        }
      }

      await base44.entities.NewsletterItem.create({
        ...dataToSave,
        is_analyzed: true,
        status: 'completed',
        date_added_to_app: new Date().toISOString(),
        source_type: dataToSave.source_type || (dataToSave.source_url?.startsWith('http') ? 'URL' : 'PDF'),
        content_type: dataToSave.content_type || (dataToSave.source_url?.startsWith('http') ? 'URL' : 'PDF'),
      });

      toast.success("Saved to library! It will appear on your Dashboard.");
      queryClient.invalidateQueries({ queryKey: ['all-newsletters'] });
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      setAnalysisResult(null);
      setUrl("");
      setFile(null);
    } catch (err) {
      console.error('Save error:', err);
      toast.error("Failed to save to library. Please try again.");
    }
  };

  const resetForm = () => {
    setAnalysisResult(null);
    setUrl("");
    setFile(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center">
            <Globe className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Additional Publishers</h1>
            <p className="text-slate-600 text-lg mt-1">
              Analyze any healthcare article or newsletter by URL or PDF
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
              Analyze Another
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-slate-200/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Analyze Content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url" className="gap-2">
                  <LinkIcon className="w-4 h-4" />
                  URL
                </TabsTrigger>
                <TabsTrigger value="pdf" className="gap-2">
                  <FileUp className="w-4 h-4" />
                  PDF Upload
                </TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="space-y-4 mt-4">
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
              </TabsContent>

              <TabsContent value="pdf" className="space-y-4 mt-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    file ? "border-green-300 bg-green-50" : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isAnalyzing}
                  />
                  {file ? (
                    <div className="flex items-center justify-center gap-2 text-green-700">
                      <File className="w-5 h-5" />
                      <span className="font-medium">{file.name}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FileUp className="w-8 h-8 mx-auto text-slate-400" />
                      <p className="text-slate-600">Click to upload a PDF</p>
                      <p className="text-xs text-slate-400">Max file size: 10MB</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <Button
              onClick={analyzeNewsletter}
              disabled={isAnalyzing || (activeTab === "url" ? !url.trim() : !file)}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing {activeTab === "url" ? "URL" : "PDF"}...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze {activeTab === "url" ? "URL" : "PDF"}
                </>
              )}
            </Button>

            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-700 mb-2">Tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{activeTab === "url" ? "Paste any healthcare newsletter, article, or blog URL" : "Upload any healthcare newsletter or report as a PDF"}</li>
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