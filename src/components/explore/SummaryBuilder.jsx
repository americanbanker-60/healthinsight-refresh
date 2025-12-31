import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { generateSummary, generatePackSummary } from "../utils/aiAgents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Copy, Download, Loader2, Save } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatSummaryAsMarkdown } from "../utils/markdownFormatter";
import ReactMarkdown from "react-markdown";

export default function SummaryBuilder({ selectedNewsletters, newsletters, searchText, dateRange, activePack }) {
  const [summary, setSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [summaryTitle, setSummaryTitle] = useState("");
  const queryClient = useQueryClient();

  const selectedItems = newsletters.filter(n => selectedNewsletters.includes(n.id));

  const handleGenerateSummary = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select at least one newsletter");
      return;
    }

    setIsGenerating(true);

    try {
      const result = activePack 
        ? await generatePackSummary(selectedItems, activePack.title)
        : await generateSummary(selectedItems);

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
              onClick={handleGenerateSummary}
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
                <div className="border border-slate-200 rounded-lg p-4 bg-white max-h-96 overflow-y-auto">
                  <ReactMarkdown className="prose prose-sm prose-slate max-w-none prose-headings:font-bold prose-h2:text-lg prose-h2:mt-4 prose-h2:mb-2 prose-h3:text-base prose-h3:mt-3 prose-h3:mb-2 prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-li:my-1 prose-strong:text-slate-900 prose-strong:font-semibold">
                    {summary}
                  </ReactMarkdown>
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