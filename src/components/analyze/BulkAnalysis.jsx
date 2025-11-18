import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Loader2, Search, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function BulkAnalysis() {
  const navigate = useNavigate();
  const [sourceUrl, setSourceUrl] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [newsletters, setNewsletters] = useState([]);
  const [selectedNewsletters, setSelectedNewsletters] = useState(new Set());
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);

  const crawlSource = async () => {
    if (!sourceUrl.trim()) {
      setError("Please enter a valid URL");
      return;
    }

    setIsCrawling(true);
    setError(null);
    setNewsletters([]);
    setSelectedNewsletters(new Set());

    try {
      // Fetch page content using Jina reader
      const pageContent = await fetch(`https://r.jina.ai/${sourceUrl}`).then(res => res.text());
      
      // Extract all newsletter links using regex pattern matching
      const extractedNewsletters = [];
      
      // Pattern to match date followed by title and link (eepurl or other domains)
      // Format: MM/DD/YYYY\n\n[Title](http://...)
      const pattern = /(\d{1,2}\/\d{1,2}\/\d{4})\s*\n+\s*\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
      
      let match;
      while ((match = pattern.exec(pageContent)) !== null) {
        const dateStr = match[1];
        const title = match[2].replace(/\\/g, ''); // Remove escaped characters
        const url = match[3];
        
        // Parse and format date (MM/DD/YYYY -> YYYY-MM-DD)
        const dateParts = dateStr.split('/');
        const month = dateParts[0].padStart(2, '0');
        const day = dateParts[1].padStart(2, '0');
        const year = dateParts[2];
        const formattedDate = `${year}-${month}-${day}`;
        
        extractedNewsletters.push({
          title,
          url,
          date: formattedDate,
          preview: ""
        });
      }

      if (extractedNewsletters.length > 0) {
        setNewsletters(extractedNewsletters);
        setSelectedNewsletters(new Set(extractedNewsletters.map((_, idx) => idx)));
      } else {
        setError("No newsletters found on this page. Try a different URL.");
      }
    } catch (err) {
      setError("Error crawling the source. Please try again.");
      console.error(err);
    }
    
    setIsCrawling(false);
  };

  const toggleNewsletter = (index) => {
    const newSelected = new Set(selectedNewsletters);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedNewsletters(newSelected);
  };

  const processSelectedNewsletters = async () => {
    const selected = newsletters.filter((_, idx) => selectedNewsletters.has(idx));
    if (selected.length === 0) return;

    setIsProcessing(true);
    setProcessedCount(0);
    setProcessingProgress(0);

    for (let i = 0; i < selected.length; i++) {
      const newsletter = selected[i];
      
      try {
        const analysis = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this healthcare newsletter from ${newsletter.url} and extract structured insights. Focus on:
1. TLDR (2-3 sentence summary)
2. Key statistics and figures mentioned
3. Recommended actions for healthcare executives
4. Key takeaways and main points
5. Major themes and topics
6. M&A activities (mergers, acquisitions, deals)
7. Funding rounds and investments
8. Key players (companies, organizations)
9. Overall market sentiment
10. Executive summary

Extract detailed information about the healthcare industry developments mentioned in this newsletter.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              publication_date: { type: "string" },
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
              recommended_actions: { type: "array", items: { type: "string" } },
              key_takeaways: { type: "array", items: { type: "string" } },
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
              key_players: { type: "array", items: { type: "string" } },
              summary: { type: "string" },
              sentiment: { type: "string", enum: ["positive", "neutral", "negative", "mixed"] }
            }
          }
        });

        await base44.entities.Newsletter.create({
          ...analysis,
          source_url: newsletter.url,
          title: analysis.title || newsletter.title,
          publication_date: analysis.publication_date || newsletter.date
        });
      } catch (err) {
        console.error(`Error processing ${newsletter.title}:`, err);
      }

      setProcessedCount(i + 1);
      setProcessingProgress(((i + 1) / selected.length) * 100);
    }

    setIsProcessing(false);
    navigate(createPageUrl("Dashboard"));
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <Input
          placeholder="https://elion.health/newsletter"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="h-14 text-lg border-slate-300 focus:border-blue-500"
          disabled={isCrawling || isProcessing}
        />
        <p className="text-sm text-slate-500 mt-2">
          Paste the URL of a page that lists multiple newsletters (e.g., archive page, blog homepage)
        </p>
      </div>

      {newsletters.length === 0 ? (
        <>
          <Button
            onClick={crawlSource}
            disabled={isCrawling || !sourceUrl.trim() || isProcessing}
            className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg shadow-purple-500/30"
          >
            {isCrawling ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Crawling Source...
              </>
            ) : (
              <>
                <Search className="w-5 h-5 mr-2" />
                Find Newsletters
              </>
            )}
          </Button>

          <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
            <h3 className="font-semibold text-slate-900 mb-3">How it works:</h3>
            <ul className="space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">1.</span>
                <span>We'll scan the page and find all newsletter links</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">2.</span>
                <span>You select which newsletters to analyze</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">3.</span>
                <span>AI extracts insights from each selected newsletter</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">4.</span>
                <span>All analyses are saved to your library automatically</span>
              </li>
            </ul>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Found {newsletters.length} newsletters
            </h3>
            <Badge variant="outline" className="text-sm">
              {selectedNewsletters.size} selected
            </Badge>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-3">
            {newsletters.map((newsletter, index) => (
              <Card key={index} className="border-slate-200 hover:border-blue-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedNewsletters.has(index)}
                      onCheckedChange={() => toggleNewsletter(index)}
                      disabled={isProcessing}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-slate-900 mb-1">{newsletter.title}</h4>
                        <a
                          href={newsletter.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-blue-600 transition-colors flex-shrink-0"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      {newsletter.date && (
                        <p className="text-xs text-slate-500 mb-1">{newsletter.date}</p>
                      )}
                      {newsletter.preview && (
                        <p className="text-sm text-slate-600 line-clamp-2">{newsletter.preview}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {isProcessing && (
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="font-medium text-slate-900">
                  Processing newsletters... {processedCount} of {selectedNewsletters.size}
                </span>
              </div>
              <Progress value={processingProgress} className="h-2" />
              <p className="text-sm text-slate-600 mt-3">
                This may take a few minutes depending on the number of newsletters selected.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setNewsletters([]);
                setSelectedNewsletters(new Set());
              }}
              disabled={isProcessing}
              className="flex-1"
            >
              Start Over
            </Button>
            <Button
              onClick={processSelectedNewsletters}
              disabled={selectedNewsletters.size === 0 || isProcessing}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg shadow-green-500/30"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Analyze {selectedNewsletters.size} Newsletter{selectedNewsletters.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}