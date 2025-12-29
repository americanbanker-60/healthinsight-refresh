import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Check, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "../common/ConfirmDialog";

const categories = ["Investment Banking", "Technology", "Finance", "Operations", "Policy", "General", "Other"];

export default function SourceList({ sources, showDeleted }) {
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "", url: "", category: "General" });
  const [deleteSourceId, setDeleteSourceId] = useState(null);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Source.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      setEditingId(null);
      toast.success("Source updated successfully");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Source.update(id, { is_deleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      toast.success("Source deleted successfully");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id) => base44.entities.Source.update(id, { is_deleted: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      toast.success("Source restored successfully");
    },
  });

  const activeSources = sources.filter(s => s.is_deleted !== true);
  const deletedSources = sources.filter(s => s.is_deleted === true);

  const sourcesByCategory = activeSources.reduce((acc, source) => {
    const cat = source.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(source);
    return acc;
  }, {});

  const startEdit = (source) => {
    setEditingId(source.id);
    setFormData({ name: source.name, description: source.description, url: source.url, category: source.category });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: "", description: "", url: "", category: "General" });
  };

  const saveEdit = (id) => {
    updateMutation.mutate({ id, data: formData });
  };

  return (
    <div className="space-y-6">
      {showDeleted && deletedSources.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-amber-800 mb-3 flex items-center gap-2">
            Deleted Sources
            <Badge variant="outline" className="bg-amber-100">{deletedSources.length}</Badge>
          </h2>
          <div className="grid gap-4">
            {deletedSources.map(source => (
              <Card key={source.id} className="bg-amber-50 border-amber-200">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">{source.name}</h3>
                      {source.description && (
                        <p className="text-slate-600 text-sm mt-1">{source.description}</p>
                      )}
                      {source.url && (
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline mt-1 inline-block">
                          {source.url}
                        </a>
                      )}
                      <div className="mt-2">
                        <Badge variant="outline">{source.category || "General"}</Badge>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => restoreMutation.mutate(source.id)}
                      disabled={restoreMutation.isPending}
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {categories.map(category => {
        const sourcesInCategory = sourcesByCategory[category] || [];
        if (sourcesInCategory.length === 0) return null;

        return (
          <div key={category}>
            <h2 className="text-xl font-semibold text-slate-800 mb-3 flex items-center gap-2">
              {category}
              <Badge variant="outline">{sourcesInCategory.length}</Badge>
            </h2>
            <div className="grid gap-4">
              {sourcesInCategory.map(source => (
                <Card key={source.id} className="bg-white/80 backdrop-blur-sm border-slate-200/60">
                  <CardContent className="pt-6">
                    {editingId === source.id ? (
                      <div className="space-y-4">
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Source name"
                        />
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Description"
                        />
                        <Input
                          value={formData.url}
                          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                          placeholder="URL"
                        />
                        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button onClick={() => saveEdit(source.id)} size="sm" disabled={updateMutation.isPending}>
                            <Check className="w-4 h-4 mr-2" />
                            Save
                          </Button>
                          <Button variant="outline" onClick={cancelEdit} size="sm">
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-900">{source.name}</h3>
                          {source.description && (
                            <p className="text-slate-600 text-sm mt-1">{source.description}</p>
                          )}
                          {source.url && (
                            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline mt-1 inline-block">
                              {source.url}
                            </a>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(source)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteSourceId(source.id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
      <ConfirmDialog
        open={!!deleteSourceId}
        onOpenChange={(open) => !open && setDeleteSourceId(null)}
        title="Delete Source?"
        description="This will hide the source from the sidebar. Existing newsletters will remain."
        onConfirm={() => {
          deleteMutation.mutate(deleteSourceId);
          setDeleteSourceId(null);
        }}
      />
    </div>
  );
}