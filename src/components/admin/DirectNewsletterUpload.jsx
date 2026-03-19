import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2, AlertCircle, FileText, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DirectNewsletterUpload() {
  const [urls, setUrls] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [processingPdfs, setProcessingPdfs] = useState(false);
  const queryClient = useQueryClient();

  const processNewsletters = async () => {
    if (!urls.trim()) {
      toast.error("Please paste newsletter URLs");
      return;
    }

    const urlList = urls.split('\n')
      .map(u => u.trim())
      .filter(u => u && u.startsWith('http'));

    if (urlList.length === 0) {
      toast.error("No valid URLs found");
      return;
    }

    setProcessing(true);
    setResults([]);
    const processResults = [];

    for (const url of urlList) {
      try {
        // Call backend function to analyze and create newsletter
        const response = await base44.functions.invoke('analyzeNewsletterUrl', { 
          url,
          sourceName: sourceName.trim() || undefined
        });

        if (response.data.success) {
          processResults.push({
            url,
            status: "success",
            title: response.data.title || "Untitled",
            id: response.data.id
          });
          toast.success(`✓ Added: ${response.data.title || url}`);
        } else {
          throw new Error(response.data.error || 'Unknown error');
        }

      } catch (error) {
        // If the error looks like a timeout, check if the newsletter was actually created
        const normalizedUrl = url.trim().toLowerCase().replace(/\/+$/, '');
        try {
          const existing = await base44.entities.NewsletterItem.filter({ source_url: normalizedUrl });
          if (existing.length > 0) {
            processResults.push({
              url,
              status: "success",
              title: existing[0].title || "Untitled",
              id: existing[0].id
            });
            toast.success(`✓ Added: ${existing[0].title || url}`);
            continue;
          }
        } catch {}
        processResults.push({
          url,
          status: "error",
          error: error.message
        });
        toast.error(`✗ Failed: ${url.substring(0, 50)}...`);
      }
    }

    setResults(processResults);
    setProcessing(false);
    queryClient.invalidateQueries({ queryKey: ['newsletters'] });

    const successCount = processResults.filter(r => r.status === "success").length;
    toast.success(`Processed ${successCount}/${urlList.length} newsletters`);
  };

  const handlePdfUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessingPdfs(true);

    try {
      // Upload PDF file
      const uploadResponse = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResponse.file_url;

      // Call backend function to analyze PDF and create newsletter
      const response = await base44.functions.invoke('analyzeNewsletterPDF', { 
        file_url: fileUrl,
        sourceName: sourceName.trim() || undefined
      });

      if (response.data.success) {
        toast.success(`✓ PDF uploaded: ${response.data.title}`);
        setResults(prev => [...prev, {
          file: file.name,
          status: "success",
          title: response.data.title,
          id: response.data.id
        }]);
        queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      } else {
        throw new Error(response.data.error || 'Failed to process PDF');
      }

    } catch (error) {
      toast.error(`✗ PDF processing failed: ${error.message}`);
      setResults(prev => [...prev, {
        file: file.name,
        status: "error",
        error: error.message
      }]);
    } finally {
      setProcessingPdfs(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-600" />
            Upload from URLs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-100 border border-green-300 rounded-lg p-4 text-sm">
            <p className="font-semibold text-green-900 mb-2">📰 Analyze Newsletter URLs</p>
            <p className="text-green-800 text-xs leading-relaxed">
              Paste URLs to specific newsletter articles (one per line). The system will analyze each URL directly 
              and extract the content using AI.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source-name" className="text-sm font-medium">
              Source Name (Optional)
            </Label>
            <Input
              id="source-name"
              placeholder="e.g., Health Tech Nerds, Hospitalogy, Elion Health, TripleTree"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              disabled={processing}
              className="bg-white"
            />
            <p className="text-xs text-slate-500">
              If not provided, the source will be detected from the URL
            </p>
          </div>

          <Textarea
            placeholder="https://rockhealthfhc.com/newsletter/jan-2024&#10;https://example.com/article/healthcare-trends&#10;https://another-site.com/post/123"
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            rows={6}
            className="font-mono text-sm"
            disabled={processing}
          />

          <div className="flex gap-2">
            <Button
              onClick={processNewsletters}
              disabled={processing || !urls.trim()}
              className="bg-green-600 hover:bg-green-700 flex-1"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Analyze URLs
                </>
              )}
            </Button>
            {urls.trim() && !processing && (
              <Button
                variant="outline"
                onClick={() => {
                  setUrls("");
                  setResults([]);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Upload PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 text-sm">
            <p className="font-semibold text-blue-900 mb-2">📄 Extract from PDF</p>
            <p className="text-blue-800 text-xs leading-relaxed">
              Upload a PDF file. The system will extract the title, summary, and key players using AI 
              and automatically create a Newsletter record.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source-name-pdf" className="text-sm font-medium">
              Source Name (Optional)
            </Label>
            <Input
              id="source-name-pdf"
              placeholder="e.g., Health Tech Nerds, Hospitalogy, Elion Health, TripleTree"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              disabled={processingPdfs}
              className="bg-white"
            />
            <p className="text-xs text-slate-500">
              If not provided, the source will be detected from the document
            </p>
          </div>

          <div>
            <label htmlFor="pdf-upload">
              <Button
                type="button"
                variant="outline"
                className="w-full border-blue-300 hover:bg-blue-50"
                onClick={() => document.getElementById('pdf-upload')?.click()}
                disabled={processingPdfs}
              >
                {processingPdfs ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing PDF...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose PDF File
                  </>
                )}
              </Button>
            </label>
            <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              onChange={handlePdfUpload}
              className="hidden"
              disabled={processingPdfs}
            />
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Processing Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.map((result, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  {result.status === "success" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        {result.id ? (
                          <Link
                            to={`${createPageUrl("NewsletterDetail")}?id=${result.id}`}
                            className="font-medium text-blue-700 hover:underline truncate flex items-center gap-1"
                          >
                            {result.title}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </Link>
                        ) : (
                          <p className="font-medium text-slate-900 truncate">{result.title}</p>
                        )}
                        {result.url && (
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-600 truncate block">
                            {result.url}
                          </a>
                        )}
                        {result.file && <p className="text-slate-500 truncate">{result.file}</p>}
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-red-900 truncate">{result.url || result.file}</p>
                        <p className="text-red-600 text-xs">{result.error}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}