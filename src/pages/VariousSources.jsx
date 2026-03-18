import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, AlertCircle, Sparkles, Globe, CheckCircle2,
  Link as LinkIcon, FileUp, File, Mail, Download, Save,
  TrendingUp, Lightbulb, Briefcase, DollarSign, BarChart3, CheckSquare, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ─── Email Dialog ────────────────────────────────────────────────
function EmailDialog({ open, onOpenChange, analysis }) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const send = async () => {
    if (!recipientEmail.trim()) {
      toast.error("Please enter a recipient email");
      return;
    }
    setIsSending(true);
    try {
      const subject = `Healthcare Intelligence: ${analysis.title || "Analysis"}`;
      const lines = [
        `<h2>${analysis.title || "Healthcare Intelligence Analysis"}</h2>`,
        analysis.sentiment ? `<p><strong>Sentiment:</strong> ${analysis.sentiment}</p>` : "",
        analysis.tldr ? `<h3>TL;DR</h3><p>${analysis.tldr}</p>` : "",
        analysis.summary ? `<h3>Executive Summary</h3><p>${analysis.summary}</p>` : "",
        analysis.key_takeaways?.length
          ? `<h3>Key Takeaways</h3><ul>${analysis.key_takeaways.map(t => `<li>${t}</li>`).join("")}</ul>`
          : "",
        analysis.recommended_actions?.length
          ? `<h3>Recommended Actions</h3><ol>${analysis.recommended_actions.map(a => `<li>${a}</li>`).join("")}</ol>`
          : "",
        analysis.ma_activities?.length
          ? `<h3>M&amp;A Activity</h3>${analysis.ma_activities.map(d =>
              `<p><strong>${d.acquirer || ""} → ${d.target || ""}</strong>${d.deal_value ? ` — ${d.deal_value}` : ""}<br/>${d.description || ""}</p>`
            ).join("")}`
          : "",
        analysis.source_url ? `<p><a href="${analysis.source_url}">View Original Source</a></p>` : "",
      ].filter(Boolean);

      await base44.integrations.Core.SendEmail({
        to: recipientEmail.trim(),
        subject,
        body: lines.join("\n"),
      });

      toast.success(`Sent to ${recipientEmail}`);
      setRecipientEmail("");
      onOpenChange(false);
    } catch (err) {
      console.error("Email error:", err);
      toast.error(`Email failed: ${err?.message || "Unknown error"}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Analysis via Email</DialogTitle>
          <DialogDescription>Enter a recipient email to share this healthcare intelligence report.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Input
            type="email"
            placeholder="recipient@example.com"
            value={recipientEmail}
            onChange={e => setRecipientEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={isSending} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Mail className="w-4 h-4 mr-2" />Send</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Analysis Result View ─────────────────────────────────────────
function AnalysisResult({ analysis, onReset }) {
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  const sentimentColors = {
    positive: "bg-green-100 text-green-800 border-green-200",
    neutral: "bg-slate-100 text-slate-800 border-slate-200",
    negative: "bg-red-100 text-red-800 border-red-200",
    mixed: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  const exportMarkdown = () => {
    let md = `# ${analysis.title}\n\n`;
    if (analysis.sentiment) md += `**Sentiment:** ${analysis.sentiment}\n\n`;
    if (analysis.publication_date) md += `**Date:** ${analysis.publication_date}\n\n`;
    if (analysis.source_url) md += `**Source:** ${analysis.source_url}\n\n---\n\n`;
    if (analysis.tldr) md += `## TL;DR\n\n${analysis.tldr}\n\n`;
    if (analysis.summary) md += `## Executive Summary\n\n${analysis.summary}\n\n`;
    if (analysis.key_takeaways?.length) {
      md += `## Key Takeaways\n\n${analysis.key_takeaways.map(t => `- ${t}`).join("\n")}\n\n`;
    }
    if (analysis.key_statistics?.length) {
      md += `## Key Statistics\n\n${analysis.key_statistics.map(s => `- **${s.figure}** — ${s.context}`).join("\n")}\n\n`;
    }
    if (analysis.ma_activities?.length) {
      md += `## M&A Activity\n\n${analysis.ma_activities.map(d => `### ${d.acquirer} → ${d.target}\n${d.deal_value ? `**Value:** ${d.deal_value}\n\n` : ""}${d.description}`).join("\n\n")}\n\n`;
    }
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(analysis.title || "analysis").replace(/[^a-z0-9]/gi, "_")}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold text-sm">Saved to your library</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{analysis.title}</h2>
          {analysis.sentiment && (
            <Badge className={`mt-2 border ${sentimentColors[analysis.sentiment]}`}>
              {analysis.sentiment} sentiment
            </Badge>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={exportMarkdown}>
            <Download className="w-4 h-4 mr-1" />Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowEmailDialog(true)} className="bg-blue-50 border-blue-200 hover:bg-blue-100">
            <Mail className="w-4 h-4 mr-1" />Email
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            <ArrowLeft className="w-4 h-4 mr-1" />New
          </Button>
        </div>
      </div>

      {/* TL;DR */}
      {analysis.tldr && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-bold text-slate-900 mb-2 text-xs uppercase tracking-wide">TL;DR</h3>
          <p className="text-slate-800 font-medium leading-relaxed">{analysis.tldr}</p>
        </div>
      )}

      {/* Summary */}
      {analysis.summary && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-2">Executive Summary</h3>
          <p className="text-slate-700 leading-relaxed">{analysis.summary}</p>
        </div>
      )}

      {/* Stats */}
      {analysis.key_statistics?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />Key Statistics
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {analysis.key_statistics.map((stat, i) => (
              <div key={i} className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                <div className="text-xl font-bold text-indigo-900">{stat.figure}</div>
                <p className="text-sm text-slate-600 mt-1">{stat.context}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Key Takeaways */}
        {analysis.key_takeaways?.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />Key Takeaways
            </h3>
            <ul className="space-y-2">
              {analysis.key_takeaways.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="text-blue-500 font-bold mt-0.5">•</span>{t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Themes */}
        {analysis.themes?.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-purple-600" />Major Themes
            </h3>
            <div className="space-y-3">
              {analysis.themes.map((theme, i) => (
                <div key={i} className="border-l-4 border-purple-400 pl-3">
                  <p className="font-medium text-slate-800 text-sm">{theme.theme}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{theme.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* M&A */}
      {analysis.ma_activities?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-green-600" />M&A Activity
          </h3>
          <div className="space-y-3">
            {analysis.ma_activities.map((deal, i) => (
              <div key={i} className="bg-green-50 rounded-lg p-4 border border-green-100">
                <p className="font-semibold text-slate-900">{deal.acquirer} → {deal.target}</p>
                {deal.deal_value && <p className="text-green-700 text-sm font-medium">{deal.deal_value}</p>}
                <p className="text-slate-600 text-sm mt-1">{deal.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Funding */}
      {analysis.funding_rounds?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />Funding Activity
          </h3>
          <div className="space-y-3">
            {analysis.funding_rounds.map((f, i) => (
              <div key={i} className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-slate-900">{f.company}</p>
                  <div className="flex gap-2">
                    {f.amount && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">{f.amount}</Badge>}
                    {f.round_type && <Badge variant="outline" className="text-xs">{f.round_type}</Badge>}
                  </div>
                </div>
                <p className="text-slate-600 text-sm mt-1">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <EmailDialog open={showEmailDialog} onOpenChange={setShowEmailDialog} analysis={analysis} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
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
    if (!selectedFile) return;
    if (!selectedFile.type.includes("pdf") && !selectedFile.name?.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }
    setFile(selectedFile);
    setError("");
  };

  const analyzeNewsletter = async () => {
    if (activeTab === "url" && !url.trim()) { setError("Please enter a URL"); return; }
    if (activeTab === "pdf" && !file) { setError("Please select a PDF file"); return; }

    setIsAnalyzing(true);
    setError("");

    try {
      let result;

      if (activeTab === "url") {
        // Use the backend function — it saves to DB with asServiceRole and returns the analysis
        const response = await base44.functions.invoke("analyzeNewsletterUrl", {
          url: url.trim(),
        });

        if (!response.data?.success) {
          throw new Error(response.data?.error || "Analysis failed");
        }

        // The backend function saves and returns minimal info. Fetch the full record.
        const saved = await base44.entities.NewsletterItem.filter({ source_url: url.trim().toLowerCase().replace(/\/+$/, "") });
        if (saved.length > 0) {
          result = saved[0];
        } else {
          // Fallback: construct a minimal result from the response
          result = { title: response.data.title, source_name: response.data.source_name, source_url: url.trim() };
        }

        if (response.data.message?.includes("already exists")) {
          toast.info("This article is already in your library.");
        } else {
          toast.success("Saved to library! It will appear on your Dashboard.");
        }

      } else {
        // PDF: upload then analyze via backend function
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        if (!uploadResult.file_url) throw new Error("File upload failed");

        const response = await base44.functions.invoke("analyzeNewsletterPDF", {
          file_url: uploadResult.file_url,
          sourceName: file.name.replace(/\.pdf$/i, ""),
        });

        if (!response.data?.success && !response.data?.title) {
          throw new Error(response.data?.error || "PDF analysis failed");
        }

        if (response.data.message?.includes("already exists")) {
          toast.info("This PDF is already in your library.");
        } else {
          toast.success("Saved to library! It will appear on your Dashboard.");
        }

        result = response.data;
      }

      setAnalysisResult(result);
      queryClient.invalidateQueries({ queryKey: ["newsletters"] });

    } catch (err) {
      console.error("Analysis error:", err);
      setError(err.message || "Failed to analyze. Please check your input and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setAnalysisResult(null);
    setUrl("");
    setFile(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (analysisResult) {
    return (
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <AnalysisResult analysis={analysisResult} onReset={reset} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center">
            <Globe className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Add to Library</h1>
            <p className="text-slate-500 mt-0.5">Analyze any healthcare article by URL or PDF — AI extracts key insights and saves it automatically</p>
          </div>
        </div>
      </div>

      <Card className="bg-white shadow-lg border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Analyze Content
          </CardTitle>
          <CardDescription>Paste a URL or upload a PDF. Analysis takes ~15 seconds and saves automatically to your shared library.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={val => { setActiveTab(val); setError(""); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url" className="gap-2">
                <LinkIcon className="w-4 h-4" />URL
              </TabsTrigger>
              <TabsTrigger value="pdf" className="gap-2">
                <FileUp className="w-4 h-4" />PDF Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="mt-4">
              <Input
                placeholder="https://hospitalogy.com/articles/..."
                value={url}
                onChange={e => { setUrl(e.target.value); setError(""); }}
                disabled={isAnalyzing}
                className="text-base"
              />
            </TabsContent>

            <TabsContent value="pdf" className="mt-4">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  file ? "border-green-300 bg-green-50" : "border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleFileChange} className="hidden" disabled={isAnalyzing} />
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <File className="w-5 h-5" />
                    <span className="font-medium">{file.name}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileUp className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-slate-500 font-medium">Click to upload a PDF</p>
                    <p className="text-xs text-slate-400">Max 10MB</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <Button
            onClick={analyzeNewsletter}
            disabled={isAnalyzing || (activeTab === "url" ? !url.trim() : !file)}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white h-11"
          >
            {isAnalyzing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing & saving...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Analyze & Save to Library</>
            )}
          </Button>

          <p className="text-xs text-center text-slate-400">
            The article will be analyzed by AI and automatically saved to the shared library for your whole team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}