import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertCircle, Sparkles, Globe, CheckCircle2, Link as LinkIcon, FileUp, File, Upload, FileText, Link2, Users, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AnalysisResult from "@/components/source/AnalysisResult";
import UrlRow, { STATUS } from "@/components/source/UrlRow";

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

  // Save analysis data to the frontend's dataEnv:'prod' entity client.
  // Checks for an existing prod record first (by source_url) to avoid duplicates,
  // then creates if not found. Triggers relations linking async.
  const saveAnalysisToProd = async (analysis) => {
    if (analysis.source_url) {
      try {
        const existing = await base44.entities.NewsletterItem.filter({ source_url: analysis.source_url });
        if (existing?.[0]) return existing[0];
      } catch (_) {}
    }
    const { id: _drop, ...fields } = analysis;
    const created = await base44.entities.NewsletterItem.create({
      ...fields,
      is_analyzed: true,
      status: 'completed',
    });
    if (!created?.id) throw new Error("Library save failed — entity create returned no ID");
    base44.functions.invoke('createNewsletterRelations', {
      newsletter_id: created.id,
      newsletter_data: created
    }).catch(() => {});
    return created;
  };

  const analyzeSingle = async () => {
    if (activeTab === "url" && !url.trim()) { setError("Please enter a URL"); return; }
    if (activeTab === "pdf" && !file) { setError("Please select a PDF file"); return; }
    setIsAnalyzing(true); setError("");
    try {
      let analysis;
      let isDuplicate = false;

      if (activeTab === "url") {
        const response = await base44.functions.invoke("analyzeNewsletterUrl", { url: url.trim() });
        const data = response?.data ?? response;
        if (!data?.success) throw new Error(data?.error || "Analysis failed");
        analysis = data.analysis;
        isDuplicate = !!data.isDuplicate;
      } else {
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        if (!uploadResult.file_url) throw new Error("File upload failed");
        const response = await base44.functions.invoke("analyzeNewsletterPDF", {
          file_url: uploadResult.file_url,
          sourceName: file.name.replace(/\.pdf$/i, "")
        });
        const data = response?.data ?? response;
        if (!data?.success) throw new Error(data?.error || "PDF analysis failed");
        analysis = data.analysis;
        isDuplicate = !!data.isDuplicate;
      }

      if (!analysis) throw new Error("No analysis data returned");

      // Save to prod env (frontend dataEnv:'prod' client — guaranteed correct environment)
      const result = await saveAnalysisToProd(analysis);

      if (isDuplicate) toast.info("This article is already in your library.");
      else toast.success("Saved to library!");

      setAnalysisResult(result);
      queryClient.invalidateQueries({ queryKey: ["newsletters"] });
      queryClient.invalidateQueries({ queryKey: ["all-newsletters"] });
      queryClient.invalidateQueries({ queryKey: ["my-analyzed-articles"] });
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
    const items = [...initialItems];
    for (let i = 0; i < items.length; i++) {
      items[i] = { ...items[i], status: "processing" }; setUrlItems([...items]);
      try {
        const response = await base44.functions.invoke('analyzeNewsletterUrl', { url: items[i].url, sourceName: sourceName.trim() || undefined });
        const d = response?.data ?? response;
        if (!d?.success) throw new Error(d?.error || "Analysis failed");
        const saved = await saveAnalysisToProd(d.analysis);
        items[i] = { ...items[i], status: d.isDuplicate ? "duplicate" : "success", title: saved?.title || items[i].url };
      } catch (err) {
        items[i] = { ...items[i], status: "error", errorMsg: err.message };
      }
      setUrlItems([...items]);
    }
    setIsRunning(false); setUrlInput("");
    queryClient.invalidateQueries({ queryKey: ['newsletters'] });
    queryClient.invalidateQueries({ queryKey: ['all-newsletters'] });
    queryClient.invalidateQueries({ queryKey: ['my-analyzed-articles'] });
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
      const data = response?.data ?? response;
      if (!data?.success) throw new Error(data?.error || 'PDF analysis failed');
      const saved = await saveAnalysisToProd(data.analysis);
      const entry = { file: f.name, title: saved?.title || f.name, status: data.isDuplicate ? "duplicate" : "success" };
      setPdfResults(prev => [entry, ...prev]);
      if (!data.isDuplicate) toast.success(`PDF added: ${entry.title}`);
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      queryClient.invalidateQueries({ queryKey: ['all-newsletters'] });
      queryClient.invalidateQueries({ queryKey: ['my-analyzed-articles'] });
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