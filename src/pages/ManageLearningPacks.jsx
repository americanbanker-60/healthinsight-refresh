import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RoleGuard } from "../components/auth/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Check, X, BookOpen, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const categories = ["Care Models", "Payor Topics", "Technology", "Provider Operations", "Policy & Regulation"];
const dateRanges = ["7d", "30d", "90d", "ytd", "custom"];

export default function ManageLearningPacks() {
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    pack_title: "",
    description: "",
    keywords: "",
    date_range_type: "90d",
    category: "Care Models",
    icon: "",
    sort_order: 0
  });
  const queryClient = useQueryClient();

  const { data: packs = [], isLoading } = useQuery({
    queryKey: ['learningPacks'],
    queryFn: () => base44.entities.LearningPack.list("sort_order"),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LearningPack.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learningPacks'] });
      setIsAdding(false);
      resetForm();
      toast.success("Learning Pack created successfully");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LearningPack.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learningPacks'] });
      setEditingId(null);
      toast.success("Learning Pack updated successfully");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LearningPack.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learningPacks'] });
      toast.success("Learning Pack deleted successfully");
    },
  });

  const resetForm = () => {
    setFormData({
      pack_title: "",
      description: "",
      keywords: "",
      date_range_type: "90d",
      category: "Care Models",
      icon: "",
      sort_order: 0
    });
  };

  const startEdit = (pack) => {
    setEditingId(pack.id);
    setFormData({
      pack_title: pack.pack_title || "",
      description: pack.description || "",
      keywords: pack.keywords || "",
      date_range_type: pack.date_range_type || "90d",
      category: pack.category || "Care Models",
      icon: pack.icon || "",
      sort_order: pack.sort_order || 0
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const saveEdit = (id) => {
    updateMutation.mutate({ id, data: formData });
  };

  const addPack = () => {
    if (!formData.pack_title.trim()) {
      toast.error("Pack title is required");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <Link to={createPageUrl("AdminPanel")}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Admin Panel
          </Button>
        </Link>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Manage Learning Packs</h1>
            <p className="text-slate-600 text-lg">Create and organize global learning pack definitions</p>
          </div>
          <Button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Pack
          </Button>
        </div>

        {isAdding && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle>Add New Learning Pack</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Pack title"
                value={formData.pack_title}
                onChange={(e) => setFormData({ ...formData, pack_title: e.target.value })}
              />
              <Textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <Input
                placeholder="Keywords (comma-separated)"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              />
              <Input
                placeholder="Icon (emoji)"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
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
                <Select value={formData.date_range_type} onValueChange={(value) => setFormData({ ...formData, date_range_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateRanges.map(range => (
                      <SelectItem key={range} value={range}>{range}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="number"
                placeholder="Sort order (0 = first)"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              />
              <div className="flex gap-2">
                <Button onClick={addPack} disabled={createMutation.isPending}>
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

        <div className="grid gap-4">
          {packs.map(pack => (
            <Card key={pack.id} className="bg-white/80 backdrop-blur-sm border-slate-200/60">
              <CardContent className="pt-6">
                {editingId === pack.id ? (
                  <div className="space-y-4">
                    <Input
                      value={formData.pack_title}
                      onChange={(e) => setFormData({ ...formData, pack_title: e.target.value })}
                      placeholder="Pack title"
                    />
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Description"
                    />
                    <Input
                      value={formData.keywords}
                      onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                      placeholder="Keywords"
                    />
                    <Input
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="Icon (emoji)"
                    />
                    <div className="grid grid-cols-2 gap-4">
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
                      <Select value={formData.date_range_type} onValueChange={(value) => setFormData({ ...formData, date_range_type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dateRanges.map(range => (
                            <SelectItem key={range} value={range}>{range}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                      placeholder="Sort order"
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => saveEdit(pack.id)} size="sm" disabled={updateMutation.isPending}>
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
                      <div className="flex items-center gap-3 mb-2">
                        {pack.icon && <span className="text-3xl">{pack.icon}</span>}
                        <h3 className="text-lg font-semibold text-slate-900">{pack.pack_title}</h3>
                      </div>
                      {pack.description && (
                        <p className="text-slate-600 text-sm mb-2">{pack.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {pack.category && (
                          <Badge variant="outline">{pack.category}</Badge>
                        )}
                        {pack.date_range_type && (
                          <Badge variant="secondary">{pack.date_range_type}</Badge>
                        )}
                        <Badge>Order: {pack.sort_order}</Badge>
                      </div>
                      {pack.keywords && (
                        <p className="text-xs text-slate-500 mt-2 italic">Keywords: {pack.keywords}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(pack)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(pack.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {packs.length === 0 && !isAdding && (
          <Card className="bg-white/80 text-center py-16">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Learning Packs</h3>
            <p className="text-slate-500 mb-4">Create your first global learning pack</p>
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Pack
            </Button>
          </Card>
        )}
      </div>
    </RoleGuard>
  );
}