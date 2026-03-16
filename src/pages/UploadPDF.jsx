import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2, FileText, Link2, Users, AlertCircle, SkipForward } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

function ResultRow({ result }) {
  const isSuccess = result.status === "success";
  const isDupe = result.duplicate;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
      isSuccess ? (isDupe ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200")
                : "bg-red-50 border-red-200"
    }`}>
      {isSuccess
        ? isDupe
          ? <SkipForward className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          : <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
        : <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
      }
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${isDupe ? "text-amber-800" : isSuccess ? "text-green-900" : "text-red-900"}`}>
          {result.title || result.url || result.file}
        </p>
        <p className={`text-xs mt-0.5 ${isDupe ? "text-amber-600" : isSuccess ? "text-green-700" : "text-red-600"}`}>
          {isDupe ? "Already in the shared library — skipped" : isSuccess ? "Added to shared library" : result.error}
        </p>
      </div>
    </div>
  );
}

export default function UploadPDF() {
  const [urls, setUrls] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [processingUrls, setProcessingUrls] = useState(false);
  const [processingPdf, setProcessingPdf] = useState(false);
  const [results, setResults] = useState([]);
  const queryClient = useQueryClient();

  const handleUrlSubmit = async () => {
    const urlList = urls.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'));
    if (urlList.length === 0) {
      toast.error("Please enter at least one valid URL starting with http");
      return;
    }

    setProcessingUrls(true);
    setResults([]);
    const newResults = [];

    for (const url of urlList) {
      try {
        const response = await base44.functions.invoke('analyzeNewsletterUrl', {
          url,
          sourceName: sourceName.trim() || undefined
        });

        const isDupe = response.data?.message?.includes('already exists');
        newResults.push({
          url,
          status: "success",
          title: response.data.title || url,
          duplicate: isDupe
        });
        if (!isDupe) toast.success(`Added: ${response.data.title}`);

      } catch (error) {
        newResults.push({ url, status: "error", error: error.message });
      }
      setResults([...newResults]);
    }

    setProcessingUrls(false);
    setUrls("");
    queryClient.invalidateQueries({ queryKey: ['newsletters'] });
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
      const newResult = {
        file: file.name,
        status: "success",
        title: response.data.title || file.name,
        duplicate: isDupe
      };
      setResults(prev => [newResult, ...prev]);
      if (!isDupe) toast.success(`PDF added: ${response.data.title}`);
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });

    } catch (error) {
      setResults(prev => [{ file: file.name, status: "error", error: error.message }, ...prev]);
      toast.error(`Failed: ${error.message}`);
    } finally {
      setProcessingPdf(false);
      event.target.value = '';
    }
  };

  const successCount = results.filter(r => r.status === "success" && !r.duplicate).length;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add to Shared Library</h1>
        <p className="text-slate-500 mt-1">
          Paste a newsletter URL or upload a PDF — it will be analyzed by AI and instantly added to the shared knowledge base for your whole team.
        </p>
      </div>

      {/* Team notice */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <Users className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Shared across your team</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Everything you add here is immediately visible to all team members. Duplicates are automatically detected and skipped.
          </p>
        </div>
      </div>

      {/* Optional source name */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Publisher / Source Name <span className="text-slate-400 font-normal">(optional)</span></Label>
        <Input
          placeholder="e.g., Rock Health, Hospitalogy, TripleTree..."
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
          disabled={processingUrls || processingPdf}
          className="bg-white"
        />
        <p className="text-xs text-slate-400">If blank, the source will be detected automatically.</p>
      </div>

      {/* URL input */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="w-4 h-4 text-slate-600" />
            Paste Newsletter URL(s)
          </CardTitle>
          <CardDescription>One URL per line. The article will be fetched and analyzed automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder={"https://rockhealthfhc.com/newsletter/jan-2024\nhttps://hospitalogy.com/p/article-title"}
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            rows={4}
            className="font-mono text-sm"
            disabled={processingUrls}
          />
          <Button
            onClick={handleUrlSubmit}
            disabled={processingUrls || !urls.trim()}
            className="w-full bg-slate-800 hover:bg-slate-900"
          >
            {processingUrls
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
              : <><Upload className="w-4 h-4 mr-2" />Analyze & Add to Library</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* PDF upload */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-slate-600" />
            Upload a PDF
          </CardTitle>
          <CardDescription>Upload any healthcare newsletter or report as a PDF file.</CardDescription>
        </CardHeader>
        <CardContent>
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
          <input id="team-pdf-upload" type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" disabled={processingPdf} />
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Results</p>
            {successCount > 0 && (
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800 border-green-200">{successCount} added to library</Badge>
                <Link to={createPageUrl("ExploreAllSources")}>
                  <Button size="sm" variant="outline" className="text-xs h-7">View in Explorer →</Button>
                </Link>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {results.map((r, i) => <ResultRow key={i} result={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}