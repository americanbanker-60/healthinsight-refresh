import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

const categories = ["Investment Banking", "Technology", "Finance", "Operations", "Policy", "General", "Other"];

export default function ManageSources() {
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", url: "", category: "General" });
  const queryClient = useQueryClient();

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: () => base44.entities.Source.list("name"),
    initialData: [],
  });

  const activeSources = sources.filter(s => !s.is_deleted);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Source.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      setIsAdding(false);
      setFormData({ name: "", description: "", url: "", category: "General" });
      toast.success("Source added successfully");
    },
  });

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

  const addSource = () => {
    if (!formData.name.trim()) {
      toast.error("Source name is required");
      return;
    }
    createMutation.mutate(formData);
  };

  const sourcesByCategory = activeSources.reduce((acc, source) => {
    const cat = source.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(source);
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Manage Sources</h1>
          <p className="text-slate-600 text-lg">Organize and categorize your newsletter sources</p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Source
        </Button>
      </div>

      {isAdding && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Add New Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Source name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Input
              placeholder="URL"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            />
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={addSource} disabled={createMutation.isPending}>
                <Check className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={() => { setIsAdding(false); cancelEdit(); }}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
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
                            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(source.id)}>
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
      </div>
    </div>
  );
}