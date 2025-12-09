import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FolderOpen, Plus, Trash2, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ConfirmDialog from "../components/common/ConfirmDialog";
import EmptyState from "../components/common/EmptyState";

export default function MyCustomPacks() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPackTitle, setNewPackTitle] = useState("");
  const [newPackDescription, setNewPackDescription] = useState("");
  const [deletePackId, setDeletePackId] = useState(null);

  const { data: customPacks = [], isLoading } = useQuery({
    queryKey: ['userCustomPacks'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.UserCustomPack.filter({ created_by: user.email }, "-created_date");
    },
    initialData: [],
  });

  const { data: allPackItems = [] } = useQuery({
    queryKey: ['allUserCustomPackItems'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.UserCustomPackItem.filter({ created_by: user.email });
    },
    initialData: [],
  });

  const createPackMutation = useMutation({
    mutationFn: async ({ title, description }) => {
      return await base44.entities.UserCustomPack.create({
        pack_title: title,
        description: description || ""
      });
    },
    onSuccess: (newPack) => {
      queryClient.invalidateQueries({ queryKey: ['userCustomPacks'] });
      toast.success("Pack created!");
      setShowCreateDialog(false);
      setNewPackTitle("");
      setNewPackDescription("");
      navigate(createPageUrl("CustomPackDetail") + "?id=" + newPack.id);
    },
  });

  const deletePackMutation = useMutation({
    mutationFn: async (packId) => {
      const items = await base44.entities.UserCustomPackItem.filter({ custom_pack_id: packId });
      await Promise.all(items.map(item => base44.entities.UserCustomPackItem.delete(item.id)));
      return await base44.entities.UserCustomPack.delete(packId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCustomPacks'] });
      queryClient.invalidateQueries({ queryKey: ['allUserCustomPackItems'] });
      toast.success("Pack deleted");
    },
  });

  const getPackItemCount = (packId) => {
    return allPackItems.filter(item => item.custom_pack_id === packId).length;
  };

  const openPack = (pack) => {
    navigate(createPageUrl("CustomPackDetail") + "?id=" + pack.id);
  };

  const handleCreatePack = () => {
    if (!newPackTitle.trim()) {
      toast.error("Please enter a pack title");
      return;
    }
    createPackMutation.mutate({
      title: newPackTitle,
      description: newPackDescription
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center">
              <FolderOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">My Custom Packs</h1>
              <p className="text-slate-600 text-lg mt-1">
                Your private intelligence bundles
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Pack
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(3).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : customPacks.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No Custom Packs Yet"
          description="Create your first intelligence bundle"
          actionLabel="Create Your First Pack"
          actionIcon={Plus}
          onAction={() => setShowCreateDialog(true)}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customPacks.map(pack => {
            const itemCount = getPackItemCount(pack.id);
            const createdDate = new Date(pack.created_date);

            return (
              <Card
                key={pack.id}
                className="bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 border-slate-200/60 group cursor-pointer"
                onClick={() => openPack(pack)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-600" />
                      <Badge variant="secondary">{itemCount} items</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletePackId(pack.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <CardTitle className="text-lg group-hover:text-purple-600 transition-colors">
                    {pack.pack_title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pack.description && (
                    <p className="text-slate-600 text-sm leading-relaxed line-clamp-2">
                      {pack.description}
                    </p>
                  )}
                  
                  <div className="text-xs text-slate-500">
                    Created {format(createdDate, "MMM d, yyyy")}
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      openPack(pack);
                    }}
                  >
                    Open Pack
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deletePackId}
        onOpenChange={(open) => !open && setDeletePackId(null)}
        title="Delete Pack?"
        description="This will permanently delete the pack and all its items. This cannot be undone."
        onConfirm={() => {
          deletePackMutation.mutate(deletePackId);
          setDeletePackId(null);
        }}
      />

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Pack</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Pack Title</Label>
              <Input
                id="title"
                placeholder="e.g., MA Market Prep Packet"
                value={newPackTitle}
                onChange={(e) => setNewPackTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreatePack()}
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What's this pack about?"
                value={newPackDescription}
                onChange={(e) => setNewPackDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePack} disabled={createPackMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              Create Pack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}