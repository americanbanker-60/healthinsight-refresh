import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function DirectNewsletterUpload() {
  const [urls, setUrls] = useState("");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
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
        // Fetch the webpage content
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `Extract newsletter content from this URL and return structured data.

URL: ${url}

Return JSON with:
- title: Newsletter title
- source_name: Publication/source name
- publication_date: Date published (YYYY-MM-DD format, estimate if not clear)
- tldr: 2-3 sentence summary
- summary: Full summary paragraph
- key_takeaways: Array of main points (3-5 items)
- key_statistics: Array of {figure, context} objects
- themes: Array of {theme, description} objects
- key_players: Array of company names mentioned
- sentiment: "positive", "neutral", "negative", or "mixed"`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              source_name: { type: "string" },
              publication_date: { type: "string" },
              tldr: { type: "string" },
              summary: { type: "string" },
              key_takeaways: { type: "array", items: { type: "string" } },
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
              key_players: { type: "array", items: { type: "string" } },
              sentiment: { type: "string" }
            }
          }
        });

        // Create newsletter record
        const newsletterData = {
          ...response,
          source_url: url,
          date_added_to_app: new Date().toISOString(),
          publication_date_confidence: "medium",
          publication_date_source: "AI extraction from content",
          publication_date_notes: "Extracted via direct upload"
        };

        await base44.entities.Newsletter.create(newsletterData);

        processResults.push({
          url,
          status: "success",
          title: response.title || "Untitled"
        });

        toast.success(`✓ Added: ${response.title || url}`);

      } catch (error) {
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

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-green-600" />
          Direct Newsletter Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-green-100 border border-green-300 rounded-lg p-4 text-sm">
          <p className="font-semibold text-green-900 mb-2">📰 Upload Individual Newsletters</p>
          <p className="text-green-800 text-xs leading-relaxed">
            Paste URLs to specific newsletter articles (one per line). The system will analyze each URL directly 
            and extract the content - no crawling or scraping needed.
          </p>
        </div>

        <Textarea
          placeholder="https://rockhealthfhc.com/newsletter/jan-2024&#10;https://example.com/article/healthcare-trends&#10;https://another-site.com/post/123"
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          rows={8}
          className="font-mono text-sm"
          disabled={processing}
        />

        {results.length > 0 && (
          <div className="border rounded-lg p-4 bg-white space-y-2 max-h-64 overflow-y-auto">
            <p className="text-sm font-semibold text-slate-900 mb-2">Processing Results:</p>
            {results.map((result, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                {result.status === "success" ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{result.title}</p>
                      <p className="text-slate-500 truncate">{result.url}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-red-900 truncate">{result.url}</p>
                      <p className="text-red-600 text-xs">{result.error}</p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

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
                Analyze & Upload Newsletters
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

        <div className="text-xs text-slate-600 space-y-1">
          <p>• Each URL will be fetched and analyzed using AI</p>
          <p>• Newsletter records are created immediately</p>
          <p>• Processing typically takes 5-10 seconds per URL</p>
        </div>
      </CardContent>
    </Card>
  );
}