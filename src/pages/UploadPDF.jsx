import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Upload, Loader2, CheckCircle2, FileText, Link2, Users,
  AlertCircle, SkipForward, Clock, RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Status config
const STATUS = {
  pending:    { icon: Clock,          color: "text-slate-400",  bg: "bg-slate-50 border-slate-200",  label: "Waiting..." },
  processing: { icon: RefreshCw,      color: "text-blue-500",   bg: "bg-blue-50 border-blue-200",    label: "Analyzing with AI..." },
  success:    { icon: CheckCircle2,   color: "text-green-600",  bg: "bg-green-50 border-green-200",  label: "Added to shared library" },
  duplicate:  { icon: SkipForward,    color: "text-amber-500",  bg: "bg-amber-50 border-amber-200",  label: "Already in library — skipped" },
  error:      { icon: AlertCircle,    color: "text-red-600",    bg: "bg-red-50 border-red-200",      label: "Failed" },
};

function UrlRow({ item }) {
  const cfg = STATUS[item.status];
  const Icon = cfg.icon;
  const isProcessing = item.status === "processing";

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border text-sm transition-all duration-300 ${cfg.bg}`}>
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color} ${isProcessing ? "animate-spin" : ""}`} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 truncate text-xs font-mono">{item.url}</p>
        {item.title && item.status !== "pending" && (
          <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">{item.title}</p>
        )}
        <p className={`text-xs mt-0.5 ${cfg.color}`}>
          {item.status === "error" ? item.errorMsg : cfg.label}
        </p>
      </div>
      <Badge variant="outline" className={`text-xs shrink-0 ${cfg.color} border-current`}>
        {item.status}
      </Badge>
    </div>
  );
}

function ProgressSummary({ items }) {
  const total = items.length;
  const done = items.filter(i => ["success","duplicate","error"].includes(i.status)).length;
  const succeeded = items.filter(i => i.status === "success").length;
  const dupes = items.filter(i => i.status === "duplicate").length;
  const errors = items.filter(i => i.status === "error").length;
  const processing = items.filter(i => i.status === "processing").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">
          {done < total ? `Processing ${done + (processing > 0 ? 1 : 0)} of ${total}...` : `Finished — ${total} URL${total !== 1 ? "s" : ""} processed`}
        </span>
        <span className="text-slate-500 font-mono">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
      <div className="flex gap-3 flex-wrap text-xs">
        <span className="flex items-center gap-1 text-green-700 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />{succeeded} added
        </span>
        {dupes > 0 && (
          <span className="flex items-center gap-1 text-amber-600 font-medium">
            <SkipForward className="w-3.5 h-3.5" />{dupes} duplicate{dupes !== 1 ? "s" : ""} skipped
          </span>
        )}
        {errors > 0 && (
          <span className="flex items-center gap-1 text-red-600 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />{errors} failed
          </span>
        )}
        {processing > 0 && (
          <span className="flex items-center gap-1 text-blue-600 font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />analyzing now...
          </span>
        )}
      </div>
    </div>
  );
}

export default function UploadPDF() {
  const [urlInput, setUrlInput] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [urlItems, setUrlItems] = useState([]); // { url, status, title, errorMsg }
  const [isRunning, setIsRunning] = useState(false);
  const [processingPdf, setProcessingPdf] = useState(false);
  const [pdfResults, setPdfResults] = useState([]);
  const queryClient = useQueryClient();

  // De-duplicate URLs client-side before processing
  const parseUrls = (raw) => {
    const seen = new Set();
    return raw.split('\n')
      .map(u => u.trim())
      .filter(u => u.startsWith('http'))
      .filter(u => { if (seen.has(u)) return false; seen.add(u); return true; });
  };

  const handleUrlSubmit = async () => {
    const urlList = parseUrls(urlInput);
    if (urlList.length === 0) {
      toast.error("Please enter at least one valid URL starting with http");
      return;
    }

    // Initialize all rows as pending
    const initialItems = urlList.map(url => ({ url, status: "pending", title: null, errorMsg: null }));
    setUrlItems(initialItems);
    setIsRunning(true);

    const items = [...initialItems];

    for (let i = 0; i < items.length; i++) {
      // Set current item to processing
      items[i] = { ...items[i], status: "processing" };
      setUrlItems([...items]);

      try {
        const response = await base44.functions.invoke('analyzeNewsletterUrl', {
          url: items[i].url,
          sourceName: sourceName.trim() || undefined
        });

        const isDupe = response.data?.message?.includes('already exists');
        items[i] = {
          ...items[i],
          status: isDupe ? "duplicate" : "success",
          title: response.data.title || items[i].url,
        };

      } catch (error) {
        items[i] = { ...items[i], status: "error", errorMsg: error.message };
      }

      setUrlItems([...items]);
    }

    setIsRunning(false);
    setUrlInput("");
    queryClient.invalidateQueries({ queryKey: ['newsletters'] });

    const added = items.filter(i => i.status === "success").length;
    if (added > 0) toast.success(`${added} newsletter${added !== 1 ? "s" : ""} added to the shared library`);
  };

  const handlePdfUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProcessingPdf(true);

    try {
      const uploadResponse = await base44.integrations.Core.UploadFile({ file });
      const response = await base44.functions.invoke('analyzeNewsletterPDF', {
        file_url: uploadResponse.file_url,
        sourceName: sourceName.trim() || undefined
      });
      const isDupe = response.data?.message?.includes('already exists');
      const result = { file: file.name, title: response.data.title || file.name, status: isDupe ? "duplicate" : "success" };
      setPdfResults(prev => [result, ...prev]);
      if (!isDupe) toast.success(`PDF added: ${result.title}`);
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
    } catch (error) {
      setPdfResults(prev => [{ file: file.name, status: "error", errorMsg: error.message }, ...prev]);
      toast.error(`Failed: ${error.message}`);
    } finally {
      setProcessingPdf(false);
      event.target.value = '';
    }
  };

  const urlCount = parseUrls(urlInput).length;
  const isDone = urlItems.length > 0 && !isRunning;
  const addedCount = urlItems.filter(i => i.status === "success").length;

  const isPreview = window.location.hostname.includes('preview-sandbox');

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {isPreview && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">You're in Preview Mode</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Content added here goes to the <strong>test database</strong> and won't appear in the live app. 
              To add real content, open the <strong>published app</strong> and add newsletters there.
            </p>
          </div>
        </div>
      )}
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add to Shared Library</h1>
        <p className="text-slate-500 mt-1">
          Paste newsletter URLs or upload a PDF — AI will analyze and add them to the shared knowledge base for your whole team.
        </p>
      </div>

      {/* Team notice */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <Users className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Shared across your team</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Everything you add is immediately visible to all team members. Duplicate URLs are automatically detected and skipped.
          </p>
        </div>
      </div>

      {/* Source name */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">
          Publisher / Source Name <span className="text-slate-400 font-normal">(optional)</span>
        </Label>
        <Input
          placeholder="e.g., Rock Health, Hospitalogy, TripleTree..."
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
          disabled={isRunning || processingPdf}
          className="bg-white"
        />
        <p className="text-xs text-slate-400">If blank, the source will be detected automatically from the content.</p>
      </div>

      {/* URL input card */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="w-4 h-4 text-slate-600" />
            Paste Newsletter URL(s)
          </CardTitle>
          <CardDescription>One URL per line. Duplicates in your list are removed automatically before processing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder={"https://rockhealthfhc.com/newsletter/jan-2024\nhttps://hospitalogy.com/p/article-title"}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            rows={5}
            className="font-mono text-sm"
            disabled={isRunning}
          />
          {urlCount > 0 && !isRunning && (
            <p className="text-xs text-slate-500">{urlCount} unique URL{urlCount !== 1 ? "s" : ""} detected</p>
          )}
          <Button
            onClick={handleUrlSubmit}
            disabled={isRunning || !urlInput.trim()}
            className="w-full bg-slate-800 hover:bg-slate-900"
          >
            {isRunning
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing URLs...</>
              : <><Upload className="w-4 h-4 mr-2" />Analyze & Add to Library</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* Live progress tracker — shown as soon as processing starts */}
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
            <ProgressSummary items={urlItems} />
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {urlItems.map((item, i) => <UrlRow key={i} item={item} />)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PDF upload */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-slate-600" />
            Upload a PDF
          </CardTitle>
          <CardDescription>Upload any healthcare newsletter or report as a PDF file.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full border-slate-300"
            onClick={() => document.getElementById('team-pdf-upload')?.click()}
            disabled={processingPdf}
          >
            {processingPdf
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing PDF...</>
              : <><Upload className="w-4 h-4 mr-2" />Choose PDF File</>
            }
          </Button>
          <input id="team-pdf-upload" type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" />
          {pdfResults.map((r, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${STATUS[r.status].bg}`}>
              {React.createElement(STATUS[r.status].icon, { className: `w-4 h-4 shrink-0 mt-0.5 ${STATUS[r.status].color}` })}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{r.title || r.file}</p>
                <p className={`text-xs mt-0.5 ${STATUS[r.status].color}`}>
                  {r.status === "error" ? r.errorMsg : STATUS[r.status].label}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}