import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2, FileText, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PDFNewsletterUpload() {
  const [sourceName, setSourceName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const handlePdfUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setResult(null);

    try {
      const uploadResponse = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResponse.file_url;

      const response = await base44.functions.invoke('analyzeNewsletterPDF', {
        file_url: fileUrl,
        sourceName: sourceName.trim() || undefined
      });

      if (response.data.success) {
        setResult({ status: "success", title: response.data.title, fileName: file.name });
        toast.success(`PDF analyzed and saved: ${response.data.title}`);
        queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      } else {
        throw new Error(response.data.error || 'Failed to process PDF');
      }
    } catch (error) {
      setResult({ status: "error", error: error.message, fileName: file.name });
      toast.error(`Failed to process PDF: ${error.message}`);
    } finally {
      setProcessing(false);
      event.target.value = '';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="w-5 h-5 text-blue-600" />
          Upload a Newsletter PDF
        </CardTitle>
        <CardDescription>
          Upload any healthcare newsletter PDF — AI will extract insights, key stats, themes, and M&A activity automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pdf-source-name" className="text-sm font-medium">
            Source / Publisher Name <span className="text-slate-400 font-normal">(optional)</span>
          </Label>
          <Input
            id="pdf-source-name"
            placeholder="e.g., Rock Health, Hospitalogy, TripleTree..."
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            disabled={processing}
            className="bg-white"
          />
        </div>

        <div>
          <Button
            type="button"
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => document.getElementById('user-pdf-upload')?.click()}
            disabled={processing}
          >
            {processing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing PDF...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" />Choose PDF to Upload</>
            )}
          </Button>
          <input
            id="user-pdf-upload"
            type="file"
            accept=".pdf"
            onChange={handlePdfUpload}
            className="hidden"
            disabled={processing}
          />
          <p className="text-xs text-slate-500 mt-2 text-center">
            Supports any healthcare newsletter or report in PDF format
          </p>
        </div>

        {result && (
          <div className={`rounded-lg p-3 flex items-start gap-3 ${result.status === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            {result.status === "success" ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-900">{result.title}</p>
                  <p className="text-xs text-green-700 mt-0.5">Successfully analyzed and added to the knowledge base.</p>
                  <Link to={createPageUrl("ExploreAllSources")}>
                    <Button size="sm" className="mt-2 bg-green-600 hover:bg-green-700 text-xs h-7">
                      View in Explorer →
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <X className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">Upload failed</p>
                  <p className="text-xs text-red-700 mt-0.5">{result.error}</p>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}