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

export default function BulkAnalysis({ sourceName, onComplete }) {
  const navigate = useNavigate();
  const [indexUrl, setIndexUrl] = useState("");
  const [manualUrls, setManualUrls] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [inputMethod, setInputMethod] = useState("index");
  const [isCrawling, setIsCrawling] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [newsletters, setNewsletters] = useState([]);
  const [selectedNewsletters, setSelectedNewsletters] = useState(new Set());
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);

  const extractMainContent = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remove unwanted elements
    const selectorsToRemove = [
      'header', 'nav', 'footer', 
      '.header', '.nav', '.navigation', '.footer',
      '.cookie', '.banner', '.sidebar', 
      '[role="banner"]', '[role="navigation"]', '[role="complementary"]',
      'script', 'style', 'iframe', 'form'
    ];
    
    selectorsToRemove.forEach(selector => {
      doc.querySelectorAll(selector).forEach(el => el.remove());
    });
    
    // Try to find main content area
    let mainContent = 
      doc.querySelector('article') ||
      doc.querySelector('main') ||
      doc.querySelector('[role="main"]') ||
      doc.querySelector('.content') ||
      doc.querySelector('.article') ||
      doc.querySelector('.post') ||
      doc.querySelector('#content') ||
      doc.body;
    
    if (!mainContent) return '';
    
    // Get text and clean it
    let text = mainContent.textContent || '';
    
    // Remove excessive whitespace
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    
    return text;
  };

  const cleanPastedContent = (content) => {
    // Remove common unsubscribe footers
    const unsubscribePatterns = [
      /unsubscribe.*?$/im,
      /click here to unsubscribe.*$/im,
      /manage.*?preferences.*$/im,
      /update.*?email preferences.*$/im,
      /you.*?receiving.*?email.*$/im,
      /^\s*---+\s*$/gm,
      /view.*?in.*?browser.*$/im,
      /sent with.*?$/im,
      /powered by.*?$/im
    ];
    
    let cleaned = content;
    unsubscribePatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Remove repetitive footers (text that appears at the end and repeats common phrases)
    const lines = cleaned.split('\n');
    const lastLines = lines.slice(-10);
    
    if (lastLines.some(line => 
      line.toLowerCase().includes('privacy') ||
      line.toLowerCase().includes('terms') ||
      line.toLowerCase().includes('copyright') ||
      line.toLowerCase().includes('all rights reserved')
    )) {
      cleaned = lines.slice(0, -10).join('\n');
    }
    
    // Clean excessive whitespace
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    
    return cleaned;
  };

  const generatePreview = (content) => {
    // Extract first 2-3 sentences from content
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    const preview = sentences.slice(0, 3).join(' ').trim();
    return preview.length > 200 ? preview.substring(0, 200) + '...' : preview;
  };

  const extractLinksFromHTML = (html, baseUrl) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = [];
    const seenUrls = new Set();
    
    const base = new URL(baseUrl);
    const baseDomain = base.hostname;
    
    doc.querySelectorAll('a[href]').forEach(anchor => {
      let href = anchor.getAttribute('href');
      if (!href) return;
      
      try {
        // Convert relative URLs to absolute
        const absoluteUrl = new URL(href, baseUrl);
        
        // Only keep links from same domain
        if (absoluteUrl.hostname !== baseDomain) return;
        
        // Look for newsletter patterns
        const path = absoluteUrl.pathname.toLowerCase();
        if (path.includes('/newsletter') || 
            path.includes('/blog') || 
            path.includes('/post') ||
            path.includes('/issue')) {
          
          const url = absoluteUrl.href;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            
            // Extract title from link text
            const title = anchor.textContent.trim() || 'Untitled Newsletter';
            
            // Try to find date nearby
            let date = '';
            const datePattern = /\d{1,2}\/\d{1,2}\/\d{2,4}/;
            const nearbyText = anchor.parentElement?.textContent || '';
            const dateMatch = nearbyText.match(datePattern);
            if (dateMatch) {
              const dateParts = dateMatch[0].split('/');
              const month = dateParts[0].padStart(2, '0');
              const day = dateParts[1].padStart(2, '0');
              let year = dateParts[2];
              if (year.length === 2) year = '20' + year;
              date = `${year}-${month}-${day}`;
            }
            
            links.push({ title, url, date, preview: '' });
          }
        }
      } catch (e) {
        // Skip invalid URLs
      }
    });
    
    return links;
  };

  const collectNewsletters = async () => {
    setIsCrawling(true);
    setError(null);
    setNewsletters([]);
    setSelectedNewsletters(new Set());

    try {
      const allNewsletters = [];
      const seenUrls = new Set();

      // STEP 1A: Process index URL
      if (inputMethod === "index" && indexUrl.trim()) {
        const response = await fetch(indexUrl);
        const html = await response.text();
        const extracted = extractLinksFromHTML(html, indexUrl);
        
        // Fetch preview for each newsletter
        for (const item of extracted.slice(0, 20)) {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            
            // Try to fetch and generate preview
            try {
              const nlResponse = await fetch(item.url);
              const nlHtml = await nlResponse.text();
              const cleanContent = extractMainContent(nlHtml);
              const preview = generatePreview(cleanContent);
              allNewsletters.push({ ...item, preview });
            } catch (err) {
              allNewsletters.push(item);
            }
          }
        }
      }

      // STEP 1B: Process manual URLs
      if (inputMethod === "manual" && manualUrls.trim()) {
        const urls = manualUrls
          .split(/[\n,]/)
          .map(u => u.trim())
          .filter(u => u && u.startsWith('http'));
        
        for (const [idx, url] of urls.entries()) {
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            
            // Try to fetch and generate preview
            try {
              const response = await fetch(url);
              const html = await response.text();
              const cleanContent = extractMainContent(html);
              const preview = generatePreview(cleanContent);
              
              // Try to extract title from first line or heading
              const lines = cleanContent.split('\n').filter(l => l.trim());
              const title = lines[0]?.substring(0, 100) || `Newsletter ${idx + 1}`;
              
              allNewsletters.push({ title, url, date: '', preview });
            } catch (err) {
              allNewsletters.push({
                title: `Newsletter ${idx + 1}`,
                url: url,
                date: '',
                preview: ''
              });
            }
          }
        }
      }

      // STEP 1C: Process raw content
      if (inputMethod === "raw" && rawContent.trim()) {
        // Split by clear delimiters (multiple newlines, headings, dates)
        const sections = rawContent.split(/\n\n\n+|\n={3,}|\n-{3,}/);

        sections.forEach((section, idx) => {
        const trimmed = section.trim();
        if (trimmed.length > 100) { // Minimum content length
        // Clean the pasted content first
        const cleaned = cleanPastedContent(trimmed);

        const lines = cleaned.split('\n');
        const title = lines[0].substring(0, 100) || `Pasted Newsletter ${idx + 1}`;

        // Try to extract date
        let date = '';
        const dateMatch = cleaned.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
        if (dateMatch) {
          const dateParts = dateMatch[0].split('/');
          const month = dateParts[0].padStart(2, '0');
          const day = dateParts[1].padStart(2, '0');
          let year = dateParts[2];
          if (year.length === 2) year = '20' + year;
          date = `${year}-${month}-${day}`;
        }

        // Generate preview from cleaned content
        const preview = generatePreview(cleaned);

        allNewsletters.push({
          title: title,
          url: null,
          date: date,
          preview: preview,
          rawContent: cleaned
        });
        }
        });
      }

      // STEP 2: Validate results
      if (allNewsletters.length === 0) {
        setError("Could not find any newsletter links or content. Please try: 1) Paste several individual newsletter URLs, or 2) Paste the text content of newsletters directly.");
        setIsCrawling(false);
        return;
      }

      setNewsletters(allNewsletters);
      setSelectedNewsletters(new Set(allNewsletters.map((_, idx) => idx)));
    } catch (err) {
      setError("Error collecting newsletters. Please check your inputs and try again.");
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
        let contentSource;
        if (newsletter.rawContent) {
          const cleaned = cleanPastedContent(newsletter.rawContent);
          contentSource = `Newsletter content:\n\n${cleaned}`;
        } else {
          // Fetch and extract clean content from URL
          try {
            const response = await fetch(newsletter.url);
            const html = await response.text();
            const cleanContent = extractMainContent(html);
            
            if (cleanContent && cleanContent.length > 200) {
              contentSource = `Newsletter content:\n\n${cleanContent}`;
            } else {
              contentSource = `Newsletter URL: ${newsletter.url}`;
            }
          } catch (fetchErr) {
            contentSource = `Newsletter URL: ${newsletter.url}`;
          }
        }

        const analysis = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a seasoned healthcare investment banking and private equity analyst.

Analyze this healthcare newsletter and extract ACTIONABLE investment intelligence:

${contentSource}

${!contentSource.includes('Newsletter URL:') ? 'The content above has been extracted and cleaned from the newsletter.' : ''}

Extract structured insights:

**TLDR** - Sharp 2-3 sentence summary for executives

**KEY STATISTICS** - Extract all numbers, metrics, data points (deal values, growth rates, market sizes, patient volumes, cost savings, etc.). For each stat, provide the figure and context.

**KEY TAKEAWAYS** - 5-7 insights for investors:
- Strategic implications for healthcare investors
- Market shifts or inflection points
- Competitive dynamics emerging
- Regulatory or reimbursement trends to monitor

**RECOMMENDED ACTIONS** - 3-5 concrete next steps healthcare executives should consider

**THEMES** - 3-5 major themes with context:
- Why this matters NOW
- Investment opportunities or risks
- Which sectors/subsectors affected
- 12-24 month outlook

**M&A ACTIVITIES** - Analyze deals with strategic context:
- Strategic rationale (scale, tech acquisition, vertical integration)
- Valuation multiples if available
- Comparison to recent comparable transactions
- What this signals about sector consolidation

**FUNDING ROUNDS** - Venture insights:
- What funding signals about investor confidence
- Lead investors and their thesis
- Valuation vs sector benchmarks
- Milestones or catalysts

**KEY PLAYERS** - Companies making strategic moves

**SENTIMENT** - Overall market tone

**SUMMARY** - 2-3 paragraph executive summary for investment committee`,
          add_context_from_internet: contentSource.includes('Newsletter URL:') ? true : false,
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
          source_url: newsletter.url || "Manual Entry",
          title: analysis.title || newsletter.title,
          publication_date: analysis.publication_date || newsletter.date,
          source_name: sourceName || undefined
        });
      } catch (err) {
        console.error(`Error processing ${newsletter.title}:`, err);
      }

      setProcessedCount(i + 1);
      setProcessingProgress(((i + 1) / selected.length) * 100);
    }

    setIsProcessing(false);
    if (onComplete) {
      onComplete();
    } else {
      navigate(createPageUrl("Dashboard"));
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant={error.includes("Found") ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {newsletters.length === 0 ? (
        <>
          <Tabs value={inputMethod} onValueChange={setInputMethod}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="index">Index URL</TabsTrigger>
              <TabsTrigger value="manual">Manual URLs</TabsTrigger>
              <TabsTrigger value="raw">Paste Content</TabsTrigger>
            </TabsList>

            <TabsContent value="index" className="space-y-4 mt-4">
              <div>
                <Input
                  placeholder="https://elion.health/newsletter"
                  value={indexUrl}
                  onChange={(e) => setIndexUrl(e.target.value)}
                  className="h-14 text-lg border-slate-300 focus:border-blue-500"
                  disabled={isCrawling}
                />
                <p className="text-sm text-slate-500 mt-2">
                  URL of a page that lists multiple newsletters (archive page, blog)
                </p>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div>
                <Textarea
                  placeholder="https://elion.health/newsletter/issue-1&#10;https://elion.health/newsletter/issue-2&#10;https://elion.health/newsletter/issue-3"
                  value={manualUrls}
                  onChange={(e) => setManualUrls(e.target.value)}
                  className="h-32 text-lg border-slate-300 focus:border-blue-500"
                  disabled={isCrawling}
                />
                <p className="text-sm text-slate-500 mt-2">
                  Paste newsletter URLs, one per line or comma-separated
                </p>
              </div>
            </TabsContent>

            <TabsContent value="raw" className="space-y-4 mt-4">
              <div>
                <Textarea
                  placeholder="Paste newsletter content here... You can paste multiple newsletters separated by blank lines or dividers."
                  value={rawContent}
                  onChange={(e) => setRawContent(e.target.value)}
                  className="h-48 text-base border-slate-300 focus:border-blue-500 font-mono"
                  disabled={isCrawling}
                />
                <p className="text-sm text-slate-500 mt-2">
                  Paste raw newsletter text or HTML. Separate multiple newsletters with blank lines.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <Button
            onClick={collectNewsletters}
            disabled={isCrawling || 
              (inputMethod === "index" && !indexUrl.trim()) ||
              (inputMethod === "manual" && !manualUrls.trim()) ||
              (inputMethod === "raw" && !rawContent.trim())}
            className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg shadow-purple-500/30"
          >
            {isCrawling ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Collecting Newsletters...
              </>
            ) : (
              <>
                <Search className="w-5 h-5 mr-2" />
                Collect Newsletters
              </>
            )}
          </Button>

          <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
            <h3 className="font-semibold text-slate-900 mb-3">Three ways to analyze:</h3>
            <ul className="space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span><strong>Index URL:</strong> We parse HTML &lt;a&gt; tags to find newsletter links</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span><strong>Manual URLs:</strong> Paste specific newsletter URLs you want analyzed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span><strong>Paste Content:</strong> Copy/paste newsletter text directly</span>
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
                        {newsletter.url ? (
                          <a
                            href={newsletter.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-blue-600 transition-colors flex-shrink-0"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                      </div>
                      {newsletter.date && (
                        <p className="text-xs text-slate-500 mb-1">{newsletter.date}</p>
                      )}
                      {newsletter.preview && (
                        <p className="text-sm text-slate-600 leading-relaxed mt-2">{newsletter.preview}</p>
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