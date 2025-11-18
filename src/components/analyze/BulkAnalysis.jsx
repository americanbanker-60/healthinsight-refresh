import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, CheckCircle2, AlertCircle, ExternalLink, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function BulkAnalysis() {
  const navigate = useNavigate();
  const [indexUrl, setIndexUrl] = useState("");
  const [manualUrls, setManualUrls] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [inputMode, setInputMode] = useState("index");
  
  const [isCrawling, setIsCrawling] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [newsletters, setNewsletters] = useState([]);
  const [selectedNewsletters, setSelectedNewsletters] = useState(new Set());
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);

  const discoverNewsletters = async () => {
    setIsCrawling(true);
    setError(null);
    setNewsletters([]);
    setSelectedNewsletters(new Set());

    const discoveredItems = [];
    const seenUrls = new Set();

    try {
      // Method 1: Index URL discovery
      if (inputMode === "index" && indexUrl.trim()) {
        const html = await fetch(indexUrl).then(res => res.text());
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract all links from the page
        const links = Array.from(doc.querySelectorAll('a[href]'));
        const baseUrl = new URL(indexUrl);
        
        for (const link of links) {
          let href = link.getAttribute('href');
          if (!href) continue;
          
          // Convert relative URLs to absolute
          try {
            const fullUrl = new URL(href, indexUrl);
            
            // Only keep links from same domain
            if (fullUrl.hostname !== baseUrl.hostname) continue;
            
            // Look for newsletter patterns
            const path = fullUrl.pathname.toLowerCase();
            if (!path.includes('newsletter') && !path.includes('briefing') && 
                !fullUrl.hostname.includes('eepurl') && !fullUrl.hostname.includes('mailchi')) {
              continue;
            }
            
            const urlStr = fullUrl.toString();
            if (seenUrls.has(urlStr)) continue;
            seenUrls.add(urlStr);
            
            // Try to extract date and title
            const linkText = link.textContent.trim();
            const prevText = link.previousSibling?.textContent || '';
            const dateMatch = (prevText + linkText).match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
            
            discoveredItems.push({
              title: linkText || 'Untitled Newsletter',
              url: urlStr,
              date: dateMatch ? dateMatch[1] : '',
              source: 'index'
            });
          } catch (e) {
            continue;
          }
        }
      }

      // Method 2: Manual URLs
      if (inputMode === "manual" && manualUrls.trim()) {
        const urls = manualUrls.split(/[\n,]+/).map(u => u.trim()).filter(u => u);
        for (const url of urls) {
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            discoveredItems.push({
              title: 'Newsletter from ' + new URL(url).hostname,
              url: url,
              date: '',
              source: 'manual'
            });
          }
        }
      }

      // Method 3: Raw content
      if (inputMode === "raw" && rawContent.trim()) {
        // Split by clear delimiters
        const sections = rawContent.split(/\n\n---+\n\n|\n\n={3,}\n\n/);
        sections.forEach((section, idx) => {
          if (section.trim().length > 100) {
            const lines = section.trim().split('\n');
            const title = lines[0].substring(0, 100);
            discoveredItems.push({
              title: title || `Pasted Newsletter #${idx + 1}`,
              url: null,
              date: '',
              content: section,
              source: 'raw'
            });
          }
        });
      }

      if (discoveredItems.length === 0) {
        setError("No newsletters found. Please check your input and try again.");
      } else {
        // Limit to 20 most recent
        const limited = discoveredItems.slice(0, 20);
        setNewsletters(limited);
        setSelectedNewsletters(new Set(limited.map((_, idx) => idx)));
        
        if (discoveredItems.length > 20) {
          setError(`Found ${discoveredItems.length} newsletters. Showing the first 20. Uncheck any you don't want to analyze.`);
        }
      }
    } catch (err) {
      setError("Error discovering newsletters: " + err.message);
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

    const analyses = [];

    for (let i = 0; i < selected.length; i++) {
      const newsletter = selected[i];
      
      try {
        let contentToAnalyze = newsletter.content || newsletter.url;
        
        const analysis = await base44.integrations.Core.InvokeLLM({
          prompt: `You are analyzing a healthcare newsletter for investment intelligence purposes.

${newsletter.content ? 'Newsletter content:' : 'Newsletter URL: ' + newsletter.url}

Extract structured insights focusing on:

1. **TLDR** - Sharp 2-3 sentence executive summary
2. **KEY STATISTICS** - All important numbers, metrics, data points with context
3. **RECOMMENDED ACTIONS** - 3-5 concrete next steps for healthcare executives
4. **KEY TAKEAWAYS** - 5-7 strategic insights for investors
5. **MAJOR THEMES** - 3-5 themes with deep market context
6. **M&A ACTIVITIES** - Deals with strategic rationale and valuation context
7. **FUNDING ROUNDS** - Investment rounds with investor thesis and sector benchmarks
8. **KEY PLAYERS** - Companies making strategic moves
9. **SENTIMENT** - Overall market tone
10. **SUMMARY** - 2-3 paragraph executive summary for investment committee

Provide detailed, actionable intelligence suitable for healthcare investors and executives.`,
          add_context_from_internet: !newsletter.content,
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

        analyses.push(analysis);

        await base44.entities.Newsletter.create({
          ...analysis,
          source_url: newsletter.url || "Pasted content",
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
        <Alert variant={error.includes('Showing') ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={inputMode} onValueChange={setInputMode}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="index">Index URL</TabsTrigger>
          <TabsTrigger value="manual">Manual URLs</TabsTrigger>
          <TabsTrigger value="raw">Paste Content</TabsTrigger>
        </TabsList>

        <TabsContent value="index" className="space-y-4">
          <div>
            <Input
              placeholder="https://elion.health/newsletter"
              value={indexUrl}
              onChange={(e) => setIndexUrl(e.target.value)}
              className="h-14 text-lg"
              disabled={isCrawling || isProcessing}
            />
            <p className="text-sm text-slate-500 mt-2">
              Enter a page that lists multiple newsletters
            </p>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <div>
            <Textarea
              placeholder="https://newsletter1.com&#10;https://newsletter2.com&#10;https://newsletter3.com"
              value={manualUrls}
              onChange={(e) => setManualUrls(e.target.value)}
              className="min-h-32 text-base"
              disabled={isCrawling || isProcessing}
            />
            <p className="text-sm text-slate-500 mt-2">
              Paste newsletter URLs (one per line or comma-separated)
            </p>
          </div>
        </TabsContent>

        <TabsContent value="raw" className="space-y-4">
          <div>
            <Textarea
              placeholder="Paste newsletter content here... Separate multiple newsletters with --- on a new line"
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              className="min-h-48 text-base"
              disabled={isCrawling || isProcessing}
            />
            <p className="text-sm text-slate-500 mt-2">
              Paste full newsletter text. Use "---" to separate multiple newsletters.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {newsletters.length === 0 ? (
        <Button
          onClick={discoverNewsletters}
          disabled={isCrawling || isProcessing || 
            (inputMode === "index" && !indexUrl.trim()) ||
            (inputMode === "manual" && !manualUrls.trim()) ||
            (inputMode === "raw" && !rawContent.trim())}
          className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg shadow-purple-500/30"
        >
          {isCrawling ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Discovering Newsletters...
            </>
          ) : (
            <>
              <Search className="w-5 h-5 mr-2" />
              Find Newsletters
            </>
          )}
        </Button>
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
                        <div>
                          <h4 className="font-medium text-slate-900 mb-1">{newsletter.title}</h4>
                          {newsletter.date && (
                            <p className="text-xs text-slate-500">{newsletter.date}</p>
                          )}
                          <Badge variant="outline" className="text-xs mt-1">
                            {newsletter.source === 'raw' ? <FileText className="w-3 h-3 mr-1" /> : null}
                            {newsletter.source}
                          </Badge>
                        </div>
                        {newsletter.url && (
                          <a
                            href={newsletter.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-blue-600 transition-colors flex-shrink-0"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
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
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setNewsletters([]);
                setSelectedNewsletters(new Set());
                setError(null);
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