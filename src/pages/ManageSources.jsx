import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Globe, Plus, Trash2, RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import BackButton from "../components/navigation/BackButton";

export default function ManageSources() {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSource, setNewSource] = useState({ name: "", url: "" });
  const [scrapingId, setScrapingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["sources-admin"],
    queryFn: () => base44.entities.Source.list("name"),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Source.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources-admin"] });
      setShowAddDialog(false);
      setNewSource({ name: "", url: "" });
      toast.success("Source added");
    },
    onError: (err) => toast.error("Failed to add source: " + err.message),
  });

  const handleAdd = () => {
    if (!newSource.name.trim() || !newSource.url.trim()) {
      toast.error("Name and URL are required");
      return;
    }
    createMutation.mutate({
      name: newSource.name.trim(),
      url: newSource.url.trim(),
    });
  };

  const handleDelete = async (source) => {
    if (!confirm(`Delete "${source.name}"? This will not remove already-imported articles.`)) return;
    setDeletingId(source.id);
    try {
      await base44.entities.Source.delete(source.id);
      queryClient.invalidateQueries({ queryKey: ["sources-admin"] });
      toast.success(`"${source.name}" removed`);
    } catch (err) {
      toast.error("Delete failed: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleScrape = async (source) => {
    setScrapingId(source.id);
    try {
      const response = await base44.functions.invoke("scrapeSource", { source_id: source.id });
      const data = response?.data ?? response;
      if (data?.success) {
        toast.success(`Scraped "${source.name}": ${data.saved ?? 0} new articles saved`);
      } else {
        toast.error(`Scrape failed: ${data?.error || "Unknown error"}`);
      }
    } catch (err) {
      toast.error("Scrape failed: " + err.message);
    } finally {
      setScrapingId(null);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <BackButton className="mb-4" />

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Manage Sources</h1>
            <p className="text-slate-500 text-sm mt-0.5">Add newsletter sources and trigger article scraping</p>
          </div>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Source
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="p-12 text-center">
            <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No sources yet</p>
            <p className="text-slate-400 text-sm mt-1">Add a source to start scraping healthcare articles automatically</p>
            <Button onClick={() => setShowAddDialog(true)} className="mt-4 bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Add First Source
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <Card key={source.id} className="bg-white/80 border-slate-200/60">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{source.name}</p>
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5 truncate"
                    >
                      {source.url}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleScrape(source)}
                    disabled={scrapingId === source.id}
                  >
                    {scrapingId === source.id ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-1.5" />
                    )}
                    {scrapingId === source.id ? "Scraping..." : "Scrape Now"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(source)}
                    disabled={deletingId === source.id}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    {deletingId === source.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Newsletter Source</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="src-name">Source Name</Label>
              <Input
                id="src-name"
                placeholder="e.g. Becker's Hospital Review"
                value={newSource.name}
                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="src-url">Website URL</Label>
              <Input
                id="src-url"
                placeholder="https://www.beckershospitalreview.com"
                value={newSource.url}
                onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); setNewSource({ name: "", url: "" }); }}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending} className="bg-green-600 hover:bg-green-700">
              {createMutation.isPending ? "Adding..." : "Add Source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
