import React, { useState, useEffect } from "react";
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
import { Loader2, Search, CheckCircle2, AlertCircle, ExternalLink, FileText, Upload, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const QUEUE_STORAGE_KEY = "bulkAnalysisQueue";
const PROCESSED_STORAGE_KEY = "bulkAnalysisProcessed";

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
  const [processedNewsletters, setProcessedNewsletters] = useState([]);
  const [showConsolidatedReport, setShowConsolidatedReport] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [consolidatedReport, setConsolidatedReport] = useState(null);
  const [isExportingBatchPDF, setIsExportingBatchPDF] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [pendingQueue, setPendingQueue] = useState(null);

  // Check for unfinished queue on mount
  useEffect(() => {
    const queue = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (queue) {
      try {
        const parsed = JSON.parse(queue);
        if (parsed && parsed.length > 0) {
          setPendingQueue(parsed);
        }
      } catch (err) {
        console.error("Failed to parse queue:", err);
        localStorage.removeItem(QUEUE_STORAGE_KEY);
      }
    }
  }, []);

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

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        // Parse URLs from file (one per line)
        const urls = text
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && line.startsWith('http'));
        
        if (urls.length > 0) {
          setManualUrls(urls.join('\n'));
          setInputMethod('manual');
          toast.success(`Loaded ${urls.length} URLs from file`);
        } else {
          toast.error('No valid URLs found in file');
        }
      }
    };
    reader.readAsText(file);
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

  const saveQueue = (queue) => {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  };

  const clearQueue = () => {
    localStorage.removeItem(QUEUE_STORAGE_KEY);
    localStorage.removeItem(PROCESSED_STORAGE_KEY);
    setPendingQueue(null);
  };

  const resumeAnalysis = async () => {
    if (!pendingQueue || pendingQueue.length === 0) return;

    setIsProcessing(true);
    setProcessedCount(0);
    setProcessingProgress(0);
    let completed = 0;
    let newProcessedNewsletters = [];

    try {
      // Load previously processed items
      const processed = localStorage.getItem(PROCESSED_STORAGE_KEY);
      if (processed) {
        newProcessedNewsletters = JSON.parse(processed);
        setProcessedNewsletters(newProcessedNewsletters);
      }

      for (let i = 0; i < pendingQueue.length; i++) {
        const item = pendingQueue[i];
        
        // Check if already processed
        if (newProcessedNewsletters.some(p => p.url === item.url)) {
          console.log(`Skipping already processed: ${item.url}`);
          completed++;
          continue;
        }

        // Check database for duplicates before processing
        if (item.url) {
          const existingRecords = await base44.entities.NewsletterItem.filter({ source_url: item.url });
          if (existingRecords.length > 0) {
            console.log(`Skipping existing in database: ${item.url}`);
            completed++;
            // Remove from queue
            pendingQueue.splice(i, 1);
            i--;
            continue;
          }
        }

        try {
          let contentSource;
          if (item.rawContent) {
            const cleaned = cleanPastedContent(item.rawContent);
            contentSource = `Newsletter content:\n\n${cleaned}`;
          } else {
            try {
              const response = await fetch(item.url);
              const html = await response.text();
              const cleanContent = extractMainContent(html);
              contentSource = cleanContent && cleanContent.length > 200 
                ? `Newsletter content:\n\n${cleanContent}`
                : `Newsletter URL: ${item.url}`;
            } catch (fetchErr) {
              contentSource = `Newsletter URL: ${item.url}`;
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
            add_context_from_internet: contentSource.includes('Newsletter URL:'),
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

          const createdNewsletter = await base44.entities.NewsletterItem.create({
            ...analysis,
            source_url: item.url || "Manual Entry",
            title: analysis.title || item.title,
            publication_date: analysis.publication_date || item.date,
            source_name: sourceName || undefined
          });

          newProcessedNewsletters.push(createdNewsletter);
          completed++;
          
          // Update queue and storage
          pendingQueue.splice(i, 1);
          i--;
          saveQueue(pendingQueue);
          localStorage.setItem(PROCESSED_STORAGE_KEY, JSON.stringify(newProcessedNewsletters));
        } catch (err) {
          console.error(`Error processing ${item.title}:`, err);
          completed++;
        }

        setProcessedCount(completed);
        setProcessingProgress((completed / pendingQueue.length) * 100);
      }

      setProcessedNewsletters(newProcessedNewsletters);
      clearQueue();
      toast.success(`Resumed analysis: ${completed} items processed`);
    } catch (err) {
      console.error("Resume error:", err);
      toast.error("Failed to resume analysis");
    }

    setIsProcessing(false);
  };

  const batchAnalyzeViaFunction = async () => {
    if (inputMethod !== "manual" || !manualUrls.trim()) {
      toast.error("Please enter URLs in Manual URLs tab");
      return;
    }

    const urls = manualUrls
      .split(/[\n,]/)
      .map(u => u.trim())
      .filter(u => u && u.startsWith('http'));

    if (urls.length === 0) {
      toast.error("No valid URLs found");
      return;
    }

    // Save queue to local storage for persistence
    const queue = urls.map((url, idx) => ({
      url,
      title: `Newsletter ${idx + 1}`,
      date: '',
      preview: ''
    }));
    saveQueue(queue);
    setPendingQueue(queue);

    setIsBatchAnalyzing(true);
    setProcessedCount(0);
    setProcessingProgress(0);
    setProcessedNewsletters([]);

    for (let i = 0; i < urls.length; i++) {
      try {
        // Check database first to avoid duplicates
        const existing = await base44.entities.NewsletterItem.filter({ source_url: urls[i] });
        if (existing.length > 0) {
          console.log(`Skipping duplicate: ${urls[i]}`);
          setProcessedCount(i + 1);
          setProcessingProgress(((i + 1) / urls.length) * 100);
          continue;
        }

        const response = await base44.functions.invoke('analyzeNewsletterUrl', { url: urls[i] });
        
        if (response.data?.success) {
          // Fetch the created newsletter
          const newsletters = await base44.entities.NewsletterItem.filter({ source_url: urls[i] });
          if (newsletters.length > 0) {
            setProcessedNewsletters(prev => [...prev, newsletters[0]]);
          }
          toast.success(`Analyzed: ${response.data.title}`);
        } else {
          toast.error(`Failed to analyze ${urls[i]}: ${response.data?.error}`);
        }
      } catch (err) {
        console.error(`Error analyzing ${urls[i]}:`, err);
        toast.error(`Error: ${err.message}`);
      }

      setProcessedCount(i + 1);
      setProcessingProgress(((i + 1) / urls.length) * 100);
      
      // Update queue
      queue.splice(0, 1);
      saveQueue(queue);
    }

    clearQueue();
    setIsBatchAnalyzing(false);
    if (processedNewsletters.length > 0) {
      toast.success(`Successfully analyzed ${processedNewsletters.length} newsletters`);
    }
  };

  const processSelectedNewsletters = async () => {
    const selected = newsletters.filter((_, idx) => selectedNewsletters.has(idx));
    if (selected.length === 0) return;

    // Save queue to local storage for persistence
    saveQueue(selected);
    setPendingQueue(selected);

    setIsProcessing(true);
    setProcessedCount(0);
    setProcessingProgress(0);
    setProcessedNewsletters([]);

    let skippedCount = 0;
    let remaining = [...selected];

    for (let i = 0; i < remaining.length; i++) {
      const newsletter = remaining[i];
      
      // Check database for each URL before processing
      if (newsletter.url) {
        const existingRecords = await base44.entities.NewsletterItem.filter({ source_url: newsletter.url });
        if (existingRecords.length > 0) {
          console.log(`Skipping duplicate: ${newsletter.url}`);
          skippedCount++;
          remaining.splice(i, 1);
          i--;
          saveQueue(remaining);
          setProcessedCount(selected.length - remaining.length);
          setProcessingProgress(((selected.length - remaining.length) / selected.length) * 100);
          continue;
        }
      }
      
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

        const createdNewsletter = await base44.entities.NewsletterItem.create({
          ...analysis,
          source_url: newsletter.url || "Manual Entry",
          title: analysis.title || newsletter.title,
          publication_date: analysis.publication_date || newsletter.date,
          source_name: sourceName || undefined
        });

        setProcessedNewsletters(prev => [...prev, createdNewsletter]);
        
        // Remove from queue
        remaining.splice(i, 1);
        i--;
        saveQueue(remaining);
      } catch (err) {
        console.error(`Error processing ${newsletter.title}:`, err);
        remaining.splice(i, 1);
        i--;
        saveQueue(remaining);
      }

      setProcessedCount(selected.length - remaining.length);
      setProcessingProgress(((selected.length - remaining.length) / selected.length) * 100);
    }

    clearQueue();
    setIsProcessing(false);
    
    // Show summary if duplicates were skipped
    if (skippedCount > 0) {
      setError(`Processed ${selected.length - skippedCount} new newsletters. Skipped ${skippedCount} duplicates.`);
    }
    
    toast.success(`Successfully processed ${selected.length - skippedCount} newsletters`);
  };

  const generateConsolidatedReport = async () => {
    if (processedNewsletters.length === 0) return;

    setIsGeneratingReport(true);
    try {
      const newsletterSummaries = processedNewsletters.map(n => ({
        title: n.title,
        tldr: n.tldr,
        key_statistics: n.key_statistics,
        themes: n.themes,
        sentiment: n.sentiment
      }));

      const report = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a consolidated executive report from these ${processedNewsletters.length} analyzed newsletters:

${JSON.stringify(newsletterSummaries, null, 2)}

Create a comprehensive report with:
1. Executive Summary - Overall trends across all newsletters
2. Key Themes - Common themes and patterns
3. Market Sentiment - Overall sentiment analysis
4. Critical Statistics - Most important numbers across all sources
5. Strategic Implications - What this means for healthcare investors
6. Recommended Actions - Top 5-7 actionable insights

Format as markdown with clear sections.`,
        response_json_schema: {
          type: "object",
          properties: {
            executive_summary: { type: "string" },
            key_themes: { type: "array", items: { type: "string" } },
            market_sentiment: { type: "string" },
            critical_statistics: { type: "array", items: { type: "string" } },
            strategic_implications: { type: "string" },
            recommended_actions: { type: "array", items: { type: "string" } }
          }
        }
      });

      setConsolidatedReport(report);
      setShowConsolidatedReport(true);
      toast.success('Consolidated report generated');
    } catch (error) {
      toast.error('Failed to generate report');
      console.error(error);
    }
    setIsGeneratingReport(false);
  };

  const exportBatchPDF = async () => {
    if (processedNewsletters.length === 0) return;

    setIsExportingBatchPDF(true);
    try {
      for (let i = 0; i < processedNewsletters.length; i++) {
        const newsletter = processedNewsletters[i];
        const response = await base44.functions.invoke('exportNewsletterPDF', { 
          analysis: newsletter 
        });
        
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${newsletter.title?.replace(/[^a-z0-9]/gi, '_') || `newsletter_${i + 1}`}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      toast.success(`Exported ${processedNewsletters.length} PDFs`);
    } catch (error) {
      toast.error('Failed to export PDFs');
      console.error(error);
    }
    setIsExportingBatchPDF(false);
  };

  const downloadConsolidatedReport = () => {
    if (!consolidatedReport) return;

    let markdown = `# Consolidated Healthcare Intelligence Report\n\n`;
    markdown += `*Generated from ${processedNewsletters.length} newsletters*\n\n`;
    markdown += `---\n\n`;
    
    markdown += `## Executive Summary\n\n${consolidatedReport.executive_summary}\n\n`;
    
    if (consolidatedReport.key_themes?.length > 0) {
      markdown += `## Key Themes\n\n`;
      consolidatedReport.key_themes.forEach(theme => {
        markdown += `- ${theme}\n`;
      });
      markdown += `\n`;
    }
    
    markdown += `## Market Sentiment\n\n${consolidatedReport.market_sentiment}\n\n`;
    
    if (consolidatedReport.critical_statistics?.length > 0) {
      markdown += `## Critical Statistics\n\n`;
      consolidatedReport.critical_statistics.forEach(stat => {
        markdown += `- ${stat}\n`;
      });
      markdown += `\n`;
    }
    
    markdown += `## Strategic Implications\n\n${consolidatedReport.strategic_implications}\n\n`;
    
    if (consolidatedReport.recommended_actions?.length > 0) {
      markdown += `## Recommended Actions\n\n`;
      consolidatedReport.recommended_actions.forEach((action, i) => {
        markdown += `${i + 1}. ${action}\n`;
      });
      markdown += `\n`;
    }

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'consolidated_report.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (showConsolidatedReport && consolidatedReport) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Consolidated Intelligence Report</h2>
              <Button
                variant="outline"
                onClick={() => setShowConsolidatedReport(false)}
              >
                Back to Results
              </Button>
            </div>

            <div className="space-y-6 bg-white rounded-lg p-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Executive Summary</h3>
                <p className="text-slate-700 leading-relaxed">{consolidatedReport.executive_summary}</p>
              </div>

              {consolidatedReport.key_themes?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Key Themes</h3>
                  <ul className="space-y-2">
                    {consolidatedReport.key_themes.map((theme, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span className="text-slate-700">{theme}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Market Sentiment</h3>
                <p className="text-slate-700 leading-relaxed">{consolidatedReport.market_sentiment}</p>
              </div>

              {consolidatedReport.critical_statistics?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Critical Statistics</h3>
                  <ul className="space-y-2">
                    {consolidatedReport.critical_statistics.map((stat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-indigo-600 mt-1">•</span>
                        <span className="text-slate-700">{stat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Strategic Implications</h3>
                <p className="text-slate-700 leading-relaxed">{consolidatedReport.strategic_implications}</p>
              </div>

              {consolidatedReport.recommended_actions?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Recommended Actions</h3>
                  <ol className="space-y-2">
                    {consolidatedReport.recommended_actions.map((action, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="font-semibold text-slate-900">{i + 1}.</span>
                        <span className="text-slate-700">{action}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={downloadConsolidatedReport}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              {onComplete ? (
                <Button onClick={onComplete} className="flex-1">
                  Done
                </Button>
              ) : (
                <Button onClick={() => navigate(createPageUrl("Dashboard"))} className="flex-1">
                  Go to Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pendingQueue && pendingQueue.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <RefreshCw className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <div className="flex items-center justify-between">
              <span>
                Analysis interrupted: {pendingQueue.length} items remaining in queue
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resumeAnalysis}
                  disabled={isProcessing}
                  className="bg-amber-50 border-amber-300"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Resume Analysis
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearQueue}
                  className="text-amber-600 hover:text-amber-700"
                >
                  Clear Queue
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

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
                  disabled={isCrawling || isBatchAnalyzing}
                />
                <p className="text-sm text-slate-500 mt-2">
                  Paste newsletter URLs, one per line or comma-separated
                </p>
                <div className="mt-3 space-y-3">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={isBatchAnalyzing}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={batchAnalyzeViaFunction}
                      disabled={!manualUrls.trim() || isBatchAnalyzing || isCrawling}
                    >
                      {isBatchAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Quick Analyze
                        </>
                      )}
                    </Button>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-slate-500">
                    Upload a .txt/.csv file with URLs, or click "Quick Analyze" to analyze your list directly using the analyzeNewsletterUrl function
                  </p>
                </div>
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

          {inputMethod !== "manual" ? (
            <Button
              onClick={collectNewsletters}
              disabled={isCrawling || 
                (inputMethod === "index" && !indexUrl.trim()) ||
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
          ) : null}

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

          {(isProcessing || isBatchAnalyzing) && (
             <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
               <div className="flex items-center gap-3 mb-3">
                 <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                 <span className="font-medium text-slate-900">
                   {isBatchAnalyzing ? `Analyzing URLs... ${processedCount}` : `Processing newsletters... ${processedCount} of ${selectedNewsletters.size}`}
                 </span>
               </div>
               <Progress value={processingProgress} className="h-2" />
               <p className="text-sm text-slate-600 mt-3">
                 This may take a few minutes depending on the number of items.
               </p>
             </div>
           )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setNewsletters([]);
                setSelectedNewsletters(new Set());
                setProcessedNewsletters([]);
                setConsolidatedReport(null);
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

          {processedNewsletters.length > 0 && !isProcessing && (
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-slate-900">
                    Successfully processed {processedNewsletters.length} newsletters
                  </h3>
                </div>
                
                <div className="grid md:grid-cols-3 gap-3">
                  <Button
                    onClick={generateConsolidatedReport}
                    disabled={isGeneratingReport}
                    variant="outline"
                    className="bg-white"
                  >
                    {isGeneratingReport ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Consolidated Report
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={exportBatchPDF}
                    disabled={isExportingBatchPDF}
                    variant="outline"
                    className="bg-white"
                  >
                    {isExportingBatchPDF ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export All PDFs
                      </>
                    )}
                  </Button>

                  {onComplete ? (
                    <Button onClick={onComplete} className="bg-green-600 hover:bg-green-700">
                      Done
                    </Button>
                  ) : (
                    <Button onClick={() => navigate(createPageUrl("Dashboard"))} className="bg-green-600 hover:bg-green-700">
                      Go to Dashboard
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}