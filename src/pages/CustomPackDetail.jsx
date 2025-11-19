import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { generateCustomPackSummary } from "../components/utils/aiAgents";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FolderOpen, Trash2, Edit2, Sparkles, Copy, Download, Loader2, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import NewsletterDetailModal from "../components/explore/NewsletterDetailModal";
import { formatSummaryAsMarkdown } from "../components/utils/markdownFormatter";

export default function CustomPackDetail() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const packId = urlParams.get('id');

  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingNote, setEditingNote] = useState("");
  const [summary, setSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [detailNewsletterId, setDetailNewsletterId] = useState(null);

  const { data: pack, isLoading: packLoading } = useQuery({
    queryKey: ['userCustomPack', packId],
    queryFn: async () => {
      const packs = await base44.entities.UserCustomPack.list();
      return packs.find(p => p.id === packId);
    },
    enabled: !!packId,
  });

  const { data: packItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['userCustomPackItems', packId],
    queryFn: () => base44.entities.UserCustomPackItem.filter({ custom_pack_id: packId }, "order_index"),
    initialData: [],
    enabled: !!packId,
  });

  const { data: newsletters = [] } = useQuery({
    queryKey: ['newsletters'],
    queryFn: () => base44.entities.Newsletter.list("-publication_date", 500),
    initialData: [],
  });

  const updatePackMutation = useMutation({
    mutationFn: async ({ title, description }) => {
      return await base44.entities.UserCustomPack.update(packId, {
        pack_title: title,
        description: description
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCustomPack', packId] });
      queryClient.invalidateQueries({ queryKey: ['userCustomPacks'] });
      toast.success("Pack updated!");
      setEditMode(false);
    },
  });

  const updateItemNoteMutation = useMutation({
    mutationFn: async ({ itemId, note }) => {
      return await base44.entities.UserCustomPackItem.update(itemId, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCustomPackItems', packId] });
      toast.success("Note updated!");
      setEditingItemId(null);
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId) => {
      return await base44.entities.UserCustomPackItem.delete(itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCustomPackItems', packId] });
      toast.success("Item removed");
    },
  });

  const itemsWithNewsletters = packItems.map(item => ({
    ...item,
    newsletter: newsletters.find(n => n.id === item.item_id)
  })).filter(item => item.newsletter);

  const generateSummary = async () => {
    if (itemsWithNewsletters.length === 0) {
      toast.error("No items in pack to summarize");
      return;
    }

    setIsGenerating(true);

    try {
      const result = await generateCustomPackSummary(itemsWithNewsletters, pack?.pack_title || "Custom Intelligence Pack");

      setSummary(result);
      toast.success("Summary generated!");
    } catch (error) {
      toast.error("Failed to generate summary");
      console.error(error);
    }

    setIsGenerating(false);
  };

  const copySummary = async () => {
    try {
      const formattedSummary = await formatSummaryAsMarkdown(summary);
      
      const sourcesList = itemsWithNewsletters.map(item => {
        const n = item.newsletter;
        const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
        return `- ${n.title} – ${n.source_name} (${format(pubDate, "MMM d, yyyy")})`;
      }).join('\n');

      const fullText = `${formattedSummary}\n\n## Sources Included\n${sourcesList}`;
      
      await navigator.clipboard.writeText(fullText);
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const downloadMarkdown = async () => {
    try {
      const formattedSummary = await formatSummaryAsMarkdown(summary);
      
      const sourcesList = itemsWithNewsletters.map(item => {
        const n = item.newsletter;
        const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
        return `- **${n.title}** – ${n.source_name} (${format(pubDate, "MMM d, yyyy")})`;
      }).join('\n');

      const markdown = `# ${pack.pack_title}

${pack.description ? `**Description:** ${pack.description}\n\n` : ''}**Generated:** ${format(new Date(), "MMM d, yyyy 'at' h:mm a")}
**Items Analyzed:** ${itemsWithNewsletters.length}

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
      a.download = `${pack.pack_title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Downloaded!");
    } catch (error) {
      toast.error("Failed to download");
    }
  };

  const detailNewsletter = newsletters.find(n => n.id === detailNewsletterId);

  if (packLoading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (!pack) {
    return <div className="p-10 text-center">Pack not found</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center">
              <FolderOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{pack.pack_title}</h1>
              {pack.description && <p className="text-slate-600 text-lg mt-1">{pack.description}</p>}
              <Badge variant="secondary" className="mt-2">{itemsWithNewsletters.length} items</Badge>
            </div>
          </div>
          <Button variant="outline" onClick={() => {
            setEditTitle(pack.pack_title);
            setEditDescription(pack.description || "");
            setEditMode(true);
          }}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Pack
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pack Items</CardTitle>
            </CardHeader>
            <CardContent>
              {itemsWithNewsletters.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 mb-4">No items in this pack yet</p>
                  <p className="text-sm text-slate-400">Go to the Dashboard or Explore Sources and use the "Add to Pack" button on any newsletter to add it here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {itemsWithNewsletters.map(item => {
                    const n = item.newsletter;
                    const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
                    
                    return (
                      <Card key={item.id} className="border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                <Badge variant="outline" className="text-xs">{n.source_name}</Badge>
                                <span>{format(pubDate, "MMM d, yyyy")}</span>
                              </div>
                              <h4 className="font-semibold text-sm mb-1">{n.title}</h4>
                              {n.tldr && <p className="text-xs text-slate-600 line-clamp-2">{n.tldr}</p>}
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setDetailNewsletterId(n.id)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm("Remove this item?")) {
                                    removeItemMutation.mutate(item.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                          
                          {editingItemId === item.id ? (
                            <div className="mt-3 space-y-2">
                              <Textarea
                                value={editingNote}
                                onChange={(e) => setEditingNote(e.target.value)}
                                placeholder="Add a note..."
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => updateItemNoteMutation.mutate({ itemId: item.id, note: editingNote })}
                                >
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingItemId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : item.note ? (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                              <p className="text-slate-700">{item.note}</p>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs mt-1"
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setEditingNote(item.note);
                                }}
                              >
                                Edit note
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs mt-2"
                              onClick={() => {
                                setEditingItemId(item.id);
                                setEditingNote("");
                              }}
                            >
                              + Add note
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!summary ? (
                <Button
                  onClick={generateSummary}
                  disabled={isGenerating || itemsWithNewsletters.length === 0}
                  className="w-full"
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
              ) : (
                <>
                  <div className="max-h-96 overflow-y-auto border border-slate-200 rounded p-3 bg-slate-50">
                    <pre className="whitespace-pre-wrap text-xs font-sans text-slate-700">
                      {summary}
                    </pre>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={copySummary} variant="outline" size="sm" className="flex-1">
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                    <Button onClick={downloadMarkdown} variant="outline" size="sm" className="flex-1">
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editMode} onOpenChange={setEditMode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pack</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-title">Pack Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMode(false)}>
              Cancel
            </Button>
            <Button onClick={() => updatePackMutation.mutate({ title: editTitle, description: editDescription })}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {detailNewsletter && (
        <NewsletterDetailModal
          newsletter={detailNewsletter}
          onClose={() => setDetailNewsletterId(null)}
        />
      )}
    </div>
  );
}