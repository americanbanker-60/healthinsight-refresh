import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Copy, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import RecommendedPacks from "../packs/RecommendedPacks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SummaryBuilder({ selectedNewsletters, newsletters, searchText, dateRange }) {
  const [summary, setSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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

    const prompt = `You are analyzing ${selectedItems.length} healthcare newsletters. Generate a comprehensive executive summary.

Newsletter data:
${JSON.stringify(newsletterData, null, 2)}

Generate a summary with:
1. A 3-7 bullet TL;DR of the collective content
2. Key themes and trends across all items
3. Important statistics, policy changes, or company moves
4. A "Priority Reading" section suggesting 1-2 most important items to read first

Format your response in markdown.`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
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

  const copyToClipboard = () => {
    const sourcesList = selectedItems.map(n => {
      const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
      return `- ${n.title} – ${n.source_name} (${format(pubDate, "MMM d, yyyy")})`;
    }).join('\n');

    const fullText = `${summary}\n\n## Sources Included\n${sourcesList}`;
    
    navigator.clipboard.writeText(fullText);
    toast.success("Copied to clipboard!");
  };

  const downloadMarkdown = () => {
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

${summary}

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
                  <Button onClick={copyToClipboard} variant="outline" className="flex-1">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button onClick={downloadMarkdown} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download
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
    </div>
  );
}