import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, AlertCircle, Sparkles, Globe, CheckCircle2,
  Link as LinkIcon, FileUp, File, Mail, Download,
  TrendingUp, Lightbulb, Briefcase, DollarSign, BarChart3, ArrowLeft, ExternalLink,
  Upload, FileText, Link2, Users, SkipForward, Clock, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// ─── Status config for bulk processing ───────────────────────────
const STATUS = {
  pending:    { icon: Clock,        color: "text-slate-400",  bg: "bg-slate-50 border-slate-200",  label: "Waiting..." },
  processing: { icon: RefreshCw,    color: "text-blue-500",   bg: "bg-blue-50 border-blue-200",    label: "Analyzing with AI..." },
  success:    { icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50 border-green-200",  label: "Added to shared library" },
  duplicate:  { icon: SkipForward,  color: "text-amber-500",  bg: "bg-amber-50 border-amber-200",  label: "Already in library — skipped" },
  error:      { icon: AlertCircle,  color: "text-red-600",    bg: "bg-red-50 border-red-200",      label: "Failed" },
};

// ─── Email Dialog ────────────────────────────────────────────────
function EmailDialog({ open, onOpenChange, analysis }) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const send = async () => {
    if (!recipientEmail.trim()) { toast.error("Please enter a recipient email"); return; }
    setIsSending(true);
    try {
      const lines = [
        `<h2>${analysis.title || "Healthcare Intelligence Analysis"}</h2>`,
        analysis.tldr ? `<h3>TL;DR</h3><p>${analysis.tldr}</p>` : "",
        analysis.key_takeaways?.length
          ? `<h3>Key Takeaways</h3><ul>${analysis.key_takeaways.map(t => `<li>${t}</li>`).join("")}</ul>`
          : "",
        analysis.recommended_actions?.length
          ? `<h3>Recommended Actions</h3><ol>${analysis.recommended_actions.map(a => `<li>${a}</li>`).join("")}</ol>`
          : "",
        analysis.source_url ? `<p><a href="${analysis.source_url}">View Original Source</a></p>` : "",
      ].filter(Boolean);
      await base44.integrations.Core.SendEmail({
        to: recipientEmail.trim(),
        subject: `Healthcare Intelligence: ${analysis.title || "Analysis"}`,
        body: lines.join("\n"),
      });
      toast.success(`Sent to ${recipientEmail}`);
      setRecipientEmail("");
      onOpenChange(false);
    } catch (err) {
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
        <Input type="email" placeholder="recipient@example.com" value={recipientEmail}
          onChange={e => setRecipientEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} className="my-2" />
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
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const exportPDF = async () => {
    setIsExportingPDF(true);
    try {
      const response = await base44.functions.invoke('exportNewsletterPDF', {
        newsletterId: analysis.id,
        newsletterData: analysis
      });
      const { pdfBase64, filename } = response.data;
      const base64Data = pdfBase64.split(',')[1];
      const byteNumbers = new Uint8Array(atob(base64Data).split('').map(c => c.charCodeAt(0)));
      const blob = new Blob([byteNumbers], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = filename;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('PDF export failed: ' + err.message);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const sentimentColors = {
    positive: "bg-green-100 text-green-800 border-green-200",
    neutral: "bg-slate-100 text-slate-800 border-slate-200",
    negative: "bg-red-100 text-red-800 border-red-200",
    mixed: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold text-sm">Saved to your library</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{analysis.title}</h2>
          {analysis.sentiment && (
            <Badge className={`mt-2 border ${sentimentColors[analysis.sentiment]}`}>{analysis.sentiment} sentiment</Badge>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={isExportingPDF}>
            {isExportingPDF ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Exporting...</> : <><Download className="w-4 h-4 mr-1" />Export PDF</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowEmailDialog(true)} className="bg-blue-50 border-blue-200 hover:bg-blue-100">
            <Mail className="w-4 h-4 mr-1" />Email
          </Button>
          {analysis.id && (
            <a href={`${createPageUrl("NewsletterDetail")}?id=${analysis.id}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-700">
                <ExternalLink className="w-4 h-4 mr-1" />Full Detail
              </Button>
            </a>
          )}
          <Button variant="outline" size="sm" onClick={onReset}><ArrowLeft className="w-4 h-4 mr-1" />New</Button>
        </div>
      </div>

      {analysis.tldr && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-bold text-slate-900 mb-2 text-xs uppercase tracking-wide">TL;DR</h3>
          <p className="text-slate-800 font-medium leading-relaxed">{analysis.tldr}</p>
        </div>
      )}

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

// ─── Bulk URL row ─────────────────────────────────────────────────
function UrlRow({ item }) {
  const cfg = STATUS[item.status];
  const Icon = cfg.icon;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border text-sm transition-all ${cfg.bg}`}>
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color} ${item.status === "processing" ? "animate-spin" : ""}`} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 truncate text-xs font-mono">{item.url}</p>
        {item.title && item.status !== "pending" && <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">{item.title}</p>}
        <p className={`text-xs mt-0.5 ${cfg.color}`}>{item.status === "error" ? item.errorMsg : cfg.label}</p>
      </div>
      <Badge variant="outline" className={`text-xs shrink-0 ${cfg.color} border-current`}>{item.status}</Badge>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function VariousSources() {
  const queryClient = useQueryClient();

  // Single URL / PDF tab
  const [activeTab, setActiveTab] = useState("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const fileInputRef = useRef(null);

  // Bulk tab
  const [sourceName, setSourceName] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlItems, setUrlItems] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [processingPdf, setProcessingPdf] = useState(false);
  const [pdfResults, setPdfResults] = useState([]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.includes("pdf") && !f.name?.toLowerCase().endsWith(".pdf")) { setError("Please upload a PDF file"); return; }
    if (f.size > 10 * 1024 * 1024) { setError("File size must be less than 10MB"); return; }
    setFile(f); setError("");
  };

  const analyzeSingle = async () => {
    if (activeTab === "url" && !url.trim()) { setError("Please enter a URL"); return; }
    if (activeTab === "pdf" && !file) { setError("Please select a PDF file"); return; }
    setIsAnalyzing(true); setError("");
    try {
      let result;
      if (activeTab === "url") {
        const response = await base44.functions.invoke("analyzeNewsletterUrl", { url: url.trim() });
        if (!response.data?.success) throw new Error(response.data?.error || "Analysis failed");
        if (response.data.message?.includes("already exists")) toast.info("This article is already in your library.");
        else toast.success("Saved to library!");
        result = response.data.newsletter || { id: response.data.id, title: response.data.title, source_name: response.data.source_name, source_url: url.trim() };
      } else {
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        if (!uploadResult.file_url) throw new Error("File upload failed");
        const response = await base44.functions.invoke("analyzeNewsletterPDF", { file_url: uploadResult.file_url, sourceName: file.name.replace(/\.pdf$/i, "") });
        if (!response.data?.success) throw new Error(response.data?.error || "PDF analysis failed");
        if (response.data.message?.includes("already exists")) toast.info("This PDF is already in your library.");
        else toast.success("Saved to library!");
        result = response.data.newsletter || { id: response.data.id, title: response.data.title, source_name: response.data.source_name };
      }
      setAnalysisResult(result);
      queryClient.invalidateQueries({ queryKey: ["newsletters"] });
    } catch (err) {
      setError(err.message || "Failed to analyze. Please check your input and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setAnalysisResult(null); setUrl(""); setFile(null); setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const parseUrls = (raw) => {
    const seen = new Set();
    return raw.split('\n').map(u => u.trim()).filter(u => u.startsWith('http')).filter(u => { if (seen.has(u)) return false; seen.add(u); return true; });
  };

  const handleBulkUrlSubmit = async () => {
    const urlList = parseUrls(urlInput);
    if (urlList.length === 0) { toast.error("Please enter at least one valid URL starting with http"); return; }
    const initialItems = urlList.map(u => ({ url: u, status: "pending", title: null, errorMsg: null }));
    setUrlItems(initialItems); setIsRunning(true);
    const bulkSessionId = `bulk_${Date.now()}`;
    const items = [...initialItems];
    for (let i = 0; i < items.length; i++) {
      items[i] = { ...items[i], status: "processing" }; setUrlItems([...items]);
      try {
        const response = await base44.functions.invoke('analyzeNewsletterUrl', { url: items[i].url, sourceName: sourceName.trim() || undefined, bulkSessionId, bulkTotal: urlList.length });
        const isDupe = response.data?.message?.includes('already exists');
        items[i] = { ...items[i], status: isDupe ? "duplicate" : "success", title: response.data.title || items[i].url };
      } catch (err) {
        items[i] = { ...items[i], status: "error", errorMsg: err.message };
      }
      setUrlItems([...items]);
    }
    setIsRunning(false); setUrlInput("");
    queryClient.invalidateQueries({ queryKey: ['newsletters'] });
    const added = items.filter(i => i.status === "success").length;
    if (added > 0) toast.success(`${added} newsletter${added !== 1 ? "s" : ""} added to the shared library`);
  };

  const handleBulkPdfUpload = async (event) => {
    const f = event.target.files?.[0];
    if (!f) return;
    setProcessingPdf(true);
    try {
      const uploadResponse = await base44.integrations.Core.UploadFile({ file: f });
      const response = await base44.functions.invoke('analyzeNewsletterPDF', { file_url: uploadResponse.file_url, sourceName: sourceName.trim() || undefined });
      const isDupe = response.data?.message?.includes('already exists');
      const result = { file: f.name, title: response.data.title || f.name, status: isDupe ? "duplicate" : "success" };
      setPdfResults(prev => [result, ...prev]);
      if (!isDupe) toast.success(`PDF added: ${result.title}`);
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
    } catch (err) {
      setPdfResults(prev => [{ file: f.name, status: "error", errorMsg: err.message }, ...prev]);
      toast.error(`Failed: ${err.message}`);
    } finally {
      setProcessingPdf(false); event.target.value = '';
    }
  };

  if (analysisResult) {
    return (
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <AnalysisResult analysis={analysisResult} onReset={reset} />
      </div>
    );
  }

  const urlCount = parseUrls(urlInput).length;
  const isDone = urlItems.length > 0 && !isRunning;
  const addedCount = urlItems.filter(i => i.status === "success").length;

  const isPreviewSandbox = window.location.hostname.includes('preview-sandbox');

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      {isPreviewSandbox && (
        <div className="mb-6 bg-red-50 border-2 border-red-400 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-900 text-base">⚠️ You are in the PREVIEW SANDBOX</p>
            <p className="text-red-800 text-sm mt-1">
              Data saved here is <strong>NOT stored permanently</strong> and will be wiped. 
              To save newsletters to your real library, use the <strong>published app URL</strong> (not the preview).
            </p>
          </div>
        </div>
      )}

      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center">
          <Globe className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Add to Library</h1>
          <p className="text-slate-500 mt-0.5">Analyze healthcare articles and PDFs — AI extracts key insights and saves them automatically</p>
        </div>
      </div>

      <Tabs defaultValue="single">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="single" className="gap-2"><Sparkles className="w-4 h-4" />Single Article</TabsTrigger>
          <TabsTrigger value="bulk" className="gap-2"><Upload className="w-4 h-4" />Bulk Import</TabsTrigger>
        </TabsList>

        {/* ── Single article tab ── */}
        <TabsContent value="single">
          <Card className="bg-white shadow-lg border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-indigo-600" />Analyze Content
              </CardTitle>
              <CardDescription>Paste a URL or upload a PDF. Analysis takes ~15 seconds and saves automatically to the shared library.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={activeTab} onValueChange={val => { setActiveTab(val); setError(""); }}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url" className="gap-2"><LinkIcon className="w-4 h-4" />URL</TabsTrigger>
                  <TabsTrigger value="pdf" className="gap-2"><FileUp className="w-4 h-4" />PDF Upload</TabsTrigger>
                </TabsList>
                <TabsContent value="url" className="mt-4">
                  <Input placeholder="https://hospitalogy.com/articles/..." value={url}
                    onChange={e => { setUrl(e.target.value); setError(""); }} disabled={isAnalyzing} className="text-base" />
                </TabsContent>
                <TabsContent value="pdf" className="mt-4">
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${file ? "border-green-300 bg-green-50" : "border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30"}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleFileChange} className="hidden" disabled={isAnalyzing} />
                    {file ? (
                      <div className="flex items-center justify-center gap-2 text-green-700">
                        <File className="w-5 h-5" /><span className="font-medium">{file.name}</span>
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
                onClick={analyzeSingle}
                disabled={isAnalyzing || (activeTab === "url" ? !url.trim() : !file)}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white h-11"
              >
                {isAnalyzing
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing & saving...</>
                  : <><Sparkles className="w-4 h-4 mr-2" />Analyze & Save to Library</>}
              </Button>
              <p className="text-xs text-center text-slate-400">Saved to the shared library for your whole team.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Bulk import tab ── */}
        <TabsContent value="bulk" className="space-y-5">
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <Users className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Shared across your team</p>
              <p className="text-xs text-blue-700 mt-0.5">Everything you add is immediately visible to all team members. Duplicate URLs are automatically detected and skipped.</p>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-medium">Publisher / Source Name <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input placeholder="e.g., Rock Health, Hospitalogy, TripleTree..." value={sourceName}
              onChange={e => setSourceName(e.target.value)} disabled={isRunning || processingPdf} className="bg-white" />
            <p className="text-xs text-slate-400">If blank, detected automatically from content.</p>
          </div>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="w-4 h-4 text-slate-600" />Paste Newsletter URL(s)
              </CardTitle>
              <CardDescription>One URL per line. Duplicates are removed automatically before processing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea placeholder={"https://rockhealthfhc.com/newsletter/jan-2024\nhttps://hospitalogy.com/p/article-title"}
                value={urlInput} onChange={e => setUrlInput(e.target.value)} rows={5} className="font-mono text-sm" disabled={isRunning} />
              {urlCount > 0 && !isRunning && <p className="text-xs text-slate-500">{urlCount} unique URL{urlCount !== 1 ? "s" : ""} detected</p>}
              <Button onClick={handleBulkUrlSubmit} disabled={isRunning || !urlInput.trim()} className="w-full bg-slate-800 hover:bg-slate-900">
                {isRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing URLs...</> : <><Upload className="w-4 h-4 mr-2" />Analyze & Add to Library</>}
              </Button>
            </CardContent>
          </Card>

          {urlItems.length > 0 && (
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Processing Progress</CardTitle>
                  {isDone && addedCount > 0 && (
                    <Link to={createPageUrl("ExploreAllSources")}>
                      <Button size="sm" variant="outline" className="text-xs h-7">View in Explorer →</Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const total = urlItems.length;
                  const done = urlItems.filter(i => ["success","duplicate","error"].includes(i.status)).length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-slate-700">{done < total ? `Processing ${done + (urlItems.filter(i=>i.status==="processing").length > 0 ? 1 : 0)} of ${total}...` : `Finished — ${total} processed`}</span>
                        <span className="text-slate-500 font-mono">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                      <div className="flex gap-3 flex-wrap text-xs">
                        <span className="flex items-center gap-1 text-green-700 font-medium"><CheckCircle2 className="w-3.5 h-3.5" />{urlItems.filter(i=>i.status==="success").length} added</span>
                        {urlItems.filter(i=>i.status==="duplicate").length > 0 && <span className="flex items-center gap-1 text-amber-600 font-medium"><SkipForward className="w-3.5 h-3.5" />{urlItems.filter(i=>i.status==="duplicate").length} skipped</span>}
                        {urlItems.filter(i=>i.status==="error").length > 0 && <span className="flex items-center gap-1 text-red-600 font-medium"><AlertCircle className="w-3.5 h-3.5" />{urlItems.filter(i=>i.status==="error").length} failed</span>}
                      </div>
                    </div>
                  );
                })()}
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {urlItems.map((item, i) => <UrlRow key={i} item={item} />)}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4 text-slate-600" />Upload a PDF
              </CardTitle>
              <CardDescription>Upload any healthcare newsletter or report as a PDF file.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button type="button" variant="outline" className="w-full border-slate-300"
                onClick={() => document.getElementById('bulk-pdf-upload')?.click()} disabled={processingPdf}>
                {processingPdf ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing PDF...</> : <><Upload className="w-4 h-4 mr-2" />Choose PDF File</>}
              </Button>
              <input id="bulk-pdf-upload" type="file" accept=".pdf" onChange={handleBulkPdfUpload} className="hidden" />
              {pdfResults.map((r, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${STATUS[r.status].bg}`}>
                  {React.createElement(STATUS[r.status].icon, { className: `w-4 h-4 shrink-0 mt-0.5 ${STATUS[r.status].color}` })}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{r.title || r.file}</p>
                    <p className={`text-xs mt-0.5 ${STATUS[r.status].color}`}>{r.status === "error" ? r.errorMsg : STATUS[r.status].label}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}