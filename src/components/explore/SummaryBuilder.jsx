import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { securedInvokeLLM } from "../utils/aiDefenseWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Copy, Download, Loader2, Save } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import RecommendedPacks from "../packs/RecommendedPacks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatSummaryAsMarkdown } from "../utils/markdownFormatter";

export default function SummaryBuilder({ selectedNewsletters, newsletters, searchText, dateRange, activePack }) {
  const [summary, setSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [summaryTitle, setSummaryTitle] = useState("");
  const queryClient = useQueryClient();

  const selectedItems = newsletters.filter(n => selectedNewsletters.includes(n.id));

  const generateSummary = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select at least one newsletter");
      return;
    }

    setIsGenerating(true);

    const newsletterData = selectedItems.map(n => {
      const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
      return {
        title: n.title,
        source: n.source_name,
        date: format(pubDate, "MMM d, yyyy"),
        summary: n.tldr || n.summary || "No summary available",
        key_takeaways: n.key_takeaways || [],
        themes: n.themes?.map(t => t.theme) || [],
        ma_activities: n.ma_activities || [],
        funding_rounds: n.funding_rounds || [],
        key_statistics: n.key_statistics || []
      };
    });

    const prompt = activePack 
      ? `SYSTEM OVERRIDE:
You must follow these non-negotiable rules for all outputs:

1. Do NOT hallucinate, speculate, or invent facts.
2. Use only the information explicitly provided in the inputs.
3. Do NOT recommend actions ("you should", "operators should", "investors should").
4. Summaries must be descriptive, not advisory.
5. Do NOT generate confidential or private data.
6. Maintain a professional, analytical tone suitable for M&A, strategy, or market insights.
7. Keep structure exactly as instructed in the prompt.

SYSTEM:
You are analyzing newsletter items from different sources with distinct editorial styles
(e.g., Elion Health, Health Tech Nerds, Hospitalogy, Healthcare Finance, TripleTree Insights).
Your job is to normalize their voices into a single unified, neutral, analytical tone without
losing the meaning of each source.

RULES:
- Do NOT weight one source more heavily unless the content volume is higher.
- If two sources disagree or present different angles, note the difference clearly.
- Never fabricate consensus where none exists.
- Only use the content provided.

You are a healthcare market intelligence analyst. Your task is to summarize and synthesize
all items contained in a Learning Pack. Focus on clarity and pattern recognition.
Do NOT guess or add content not present in the inputs.

USER:
Provide a high-level synthesis of the Learning Pack contents using this structure:

1. **Executive Summary (4–6 sentences)**
   - Explain the core theme of the Pack.
   - Highlight the major insights contained across the curated items.

2. **Key Drivers & Trends**
   - 3–6 trends shaping this topic.
   - Keep each trend to 2–3 sentences.

3. **What Matters for Operators / Payors / Investors**
   - Provide a short bullet section identifying implications.
   - This must be descriptive, not advisory. ("The content suggests…", not "You should…")

4. **Notable News & Events**
   - Bullet list of major events, policy changes, launches, partnerships, or analytics.
   - Only include items mentioned in the input.

5. **Terminology & Concepts (Optional)**
   - Define any key terms mentioned repeatedly.

Learning Pack: ${activePack.title}

Learning Pack contents:
${JSON.stringify(newsletterData, null, 2)}`
      : `SYSTEM OVERRIDE:
You must follow these non-negotiable rules for all outputs:

1. Do NOT hallucinate, speculate, or invent facts.
2. Use only the information explicitly provided in the inputs.
3. Do NOT recommend actions ("you should", "operators should", "investors should").
4. Summaries must be descriptive, not advisory.
5. Do NOT generate confidential or private data.
6. Maintain a professional, analytical tone suitable for M&A, strategy, or market insights.
7. Keep structure exactly as instructed in the prompt.

SYSTEM:
You are analyzing newsletter items from different sources with distinct editorial styles
(e.g., Elion Health, Health Tech Nerds, Hospitalogy, Healthcare Finance, TripleTree Insights).
Your job is to normalize their voices into a single unified, neutral, analytical tone without
losing the meaning of each source.

RULES:
- Do NOT weight one source more heavily unless the content volume is higher.
- If two sources disagree or present different angles, note the difference clearly.
- Never fabricate consensus where none exists.
- Only use the content provided.

You are a healthcare insights analyst tasked with producing a 60-second briefing on a topic.
The goal is to help a busy professional quickly understand the state of the topic based
solely on the provided content. No speculation, no unsupported claims.

USER:
Create a short "Get Smart Fast" briefing with the following structure:

1. **What This Topic Is About (2–3 sentences)**
   - Plain, direct description of the topic using inputs only.

2. **Current Landscape (4–6 bullets)**
   - Capture what's happening now according to the inputs.

3. **Key Forces & Pressures (3–5 bullets)**
   - Policy, operational, payer, provider, or market dynamics.
   - Must be grounded in the input content.

4. **Recent Highlights (5–10 bullets)**
   - News, stats, regulatory notes, deals, product releases, payer updates.

5. **Reading Priority**
   - Identify the two most relevant items to start with (from inputs) and explain why.

Content:
${JSON.stringify(newsletterData, null, 2)}`;

    try {
      const result = await securedInvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setSummary(result);
      toast.success("Summary generated!");
    } catch (error) {
      toast.error("Failed to generate summary");
      console.error(error);
    }

    setIsGenerating(false);
  };

  const copyToClipboard = async () => {
    try {
      const formattedSummary = await formatSummaryAsMarkdown(summary);
      
      const sourcesList = selectedItems.map(n => {
        const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
        return `- ${n.title} – ${n.source_name} (${format(pubDate, "MMM d, yyyy")})`;
      }).join('\n');

      const fullText = `${formattedSummary}\n\n## Sources Included\n${sourcesList}`;
      
      await navigator.clipboard.writeText(fullText);
      toast.success("Copied formatted markdown to clipboard!");
    } catch (error) {
      toast.error("Failed to copy");
      console.error(error);
    }
  };

  const saveSummaryMutation = useMutation({
    mutationFn: async (title) => {
      return await base44.entities.SavedSummary.create({
        summary_title: title,
        summary_body: summary,
        sources_included: selectedItems.map(n => n.title),
        search_context: searchText || "Explore All Sources"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSummaries'] });
      setShowSaveDialog(false);
      setSummaryTitle("");
      toast.success("Saved! View it anytime in My Library.");
    },
  });

  const handleSaveSummary = () => {
    if (!summaryTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }
    saveSummaryMutation.mutate(summaryTitle);
  };

  const downloadMarkdown = async () => {
    try {
      const formattedSummary = await formatSummaryAsMarkdown(summary);
      
      const { start, end } = dateRange;
      const dateRangeText = start && end 
        ? `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`
        : "All time";

      const sourcesList = selectedItems.map(n => {
        const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
        return `- **${n.title}** – ${n.source_name} (${format(pubDate, "MMM d, yyyy")})`;
      }).join('\n');

      const markdown = `# Healthcare Newsletter Summary

**Search Query:** ${searchText || "All newsletters"}
**Date Range:** ${dateRangeText}
**Generated:** ${format(new Date(), "MMM d, yyyy 'at' h:mm a")}
**Items Analyzed:** ${selectedItems.length}

---

${formattedSummary}

---

## Sources Included

${sourcesList}
`;

      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsletter-summary-${format(new Date(), "yyyy-MM-dd")}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Downloaded!");
    } catch (error) {
      toast.error("Failed to download");
      console.error(error);
    }
  };

  return (
    <div className="space-y-4 sticky top-6">
      {selectedItems.length > 0 && (
        <RecommendedPacks
          selectedNewsletters={selectedNewsletters}
          newsletters={newsletters}
        />
      )}

      <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
        <CardHeader className="border-b border-slate-200/60">
        <CardTitle className="flex items-center justify-between">
          <span>Summary Builder</span>
          <span className="text-sm font-normal text-slate-600">
            {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {selectedItems.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">
            Select newsletters from the results to generate a summary
          </p>
        ) : (
          <>
            <Button
              onClick={generateSummary}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Summary
                </>
              )}
            </Button>

            {summary && (
              <>
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 max-h-96 overflow-y-auto">
                  <Textarea
                    value={summary}
                    readOnly
                    className="min-h-[300px] bg-white border-0 resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={copyToClipboard} variant="outline" size="sm">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button onClick={downloadMarkdown} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button onClick={() => setShowSaveDialog(true)} size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              </>
            )}

            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold text-slate-700 mb-2">Selected Items:</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {selectedItems.map(n => (
                  <div key={n.id} className="text-xs text-slate-600 truncate">
                    • {n.title}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
      </Card>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Summary to My Library</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Summary Title</Label>
              <Input
                id="title"
                placeholder="e.g., Q4 Healthcare Trends Summary"
                value={summaryTitle}
                onChange={(e) => setSummaryTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveSummary()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSummary} disabled={saveSummaryMutation.isPending}>
              {saveSummaryMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}