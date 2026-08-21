import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Search, Globe, CheckSquare, Square, Link2, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DiscoverFromSource() {
  const queryClient = useQueryClient();
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [issues, setIssues] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [isImporting, setIsImporting] = useState(false);

  const discover = async () => {
    if (!sourceUrl.trim()) { toast.error("Please enter a source page URL"); return; }
    setIsDiscovering(true);
    setIssues([]);
    setSelected(new Set());
    try {
      const response = await base44.functions.invoke("discoverNewsletterIssues", {
        action: "discover",
        sourceUrl: sourceUrl.trim(),
      });
      const data = response?.data ?? response;
      if (!data?.success) throw new Error(data?.error || "Discovery failed");
      const found = data.issues || [];
      setIssues(found);
      setSelected(new Set(found.map((_, i) => i)));
      if (found.length === 0) toast.info("No newsletter issues found on that page. Try a different source/archive URL.");
      else toast.success(`Found ${found.length} newsletter issue${found.length !== 1 ? "s" : ""}. Select which to import.`);
    } catch (err) {
      toast.error(err.message || "Failed to discover issues");
    } finally {
      setIsDiscovering(false);
    }
  };

  const toggle = (i) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => (prev.size === issues.length ? new Set() : new Set(issues.map((_, i) => i))));
  };

  const importSelected = async () => {
    const urls = issues.filter((_, i) => selected.has(i)).map((i) => i.source_url);
    if (urls.length === 0) { toast.error("Select at least one issue to import"); return; }
    setIsImporting(true);
    try {
      const response = await base44.functions.invoke("discoverNewsletterIssues", {
        action: "import",
        urls,
        sourceName: sourceName.trim(),
      });
      const data = response?.data ?? response;
      if (!data?.success) throw new Error(data?.error || "Import failed");
      toast.success(`${data.queued} issue${data.queued !== 1 ? "s" : ""} queued for analysis. Track progress in Bulk Import Monitor.`);
      queryClient.invalidateQueries({ queryKey: ["bulkImportJobs"] });
      queryClient.invalidateQueries({ queryKey: ["newsletters"] });
      queryClient.invalidateQueries({ queryKey: ["all-newsletters"] });
      setIssues([]);
      setSelected(new Set());
      setSourceUrl("");
    } catch (err) {
      toast.error(err.message || "Failed to import selected issues");
    } finally {
      setIsImporting(false);
    }
  };

  const allSelected = issues.length > 0 && selected.size === issues.length;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <Globe className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-indigo-900">Discover issues from a source page</p>
          <p className="text-xs text-indigo-700 mt-0.5">Paste a newsletter archive, index, or source page URL. We'll discover individual issues — you pick which to import.</p>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="w-4 h-4 text-slate-600" />Source Page URL
          </CardTitle>
          <CardDescription>Paste a URL that lists newsletter issues (archive, blog index, or issues page).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Publisher / Source Name <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input placeholder="e.g., Rock Health, Hospitalogy, TripleTree..." value={sourceName} onChange={(e) => setSourceName(e.target.value)} disabled={isDiscovering || isImporting} className="bg-white" />
          </div>
          <Input placeholder="https://hospitalogy.com/articles" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} disabled={isDiscovering || isImporting} className="text-base" />
          <Button onClick={discover} disabled={isDiscovering || !sourceUrl.trim()} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white">
            {isDiscovering ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Discovering issues...</> : <><Search className="w-4 h-4 mr-2" />Discover Issues</>}
          </Button>
        </CardContent>
      </Card>

      {issues.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckSquare className="w-4 h-4 text-slate-600" />{issues.length} Issue{issues.length !== 1 ? "s" : ""} Found
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs h-7">
                {allSelected ? "Deselect all" : "Select all"}
              </Button>
            </div>
            <CardDescription>{selected.size} selected for import.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {issues.map((issue, i) => {
              const isSel = selected.has(i);
              return (
                <button key={i} type="button" onClick={() => toggle(i)} className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${isSel ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                  {isSel ? <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" /> : <Square className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{issue.title || "Untitled"}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      {issue.publication_date && <span>{issue.publication_date}</span>}
                      <a href={issue.source_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-blue-600 hover:underline truncate">
                        <ExternalLink className="w-3 h-3 shrink-0" /><span className="truncate">{issue.source_url}</span>
                      </a>
                    </div>
                  </div>
                </button>
              );
            })}
            <Button onClick={importSelected} disabled={isImporting || selected.size === 0} className="w-full bg-slate-800 hover:bg-slate-900 mt-2">
              {isImporting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Queuing for analysis...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Import {selected.size} Selected Issue{selected.size !== 1 ? "s" : ""}</>}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <Link2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">Selected issues are analyzed in the background</p>
          <p className="text-xs text-slate-500 mt-0.5">After importing, issues are queued and analyzed automatically — no need to keep this tab open.</p>
        </div>
        <Link to={createPageUrl("BulkImportMonitor")}>
          <Button size="sm" variant="outline" className="text-xs h-7 shrink-0">View Monitor →</Button>
        </Link>
      </div>
    </div>
  );
}