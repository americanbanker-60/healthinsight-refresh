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
import { Plus, Edit2, Trash2, Check, X, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "../components/common/ConfirmDialog";

const categories = ["Investment Banking", "Technology", "Finance", "Operations", "Policy", "General", "Other"];

export default function ManageSources() {
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", url: "", category: "General" });
  const [deleteSourceId, setDeleteSourceId] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const queryClient = useQueryClient();

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: () => base44.entities.Source.list("name"),
    initialData: [],
  });

  const activeSources = sources.filter(s => s && typeof s === 'object' && !s.is_deleted && s.name && s.id);
  const deletedSources = sources.filter(s => s && typeof s === 'object' && s.is_deleted && s.name && s.id);

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

  const restoreMutation = useMutation({
    mutationFn: (id) => base44.entities.Source.update(id, { is_deleted: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      toast.success("Source restored successfully");
    },
  });

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
      
      // Assume first row is headers
      const headers = rows[0];
      const sourceColIndex = headers.findIndex(h => h.toLowerCase() === 'source');
      const urlColIndex = headers.findIndex(h => h.toLowerCase() === 'url');

      if (sourceColIndex === -1 || urlColIndex === -1) {
        toast.error("CSV must have 'Source' and 'URL' columns");
        return;
      }

      const preview = rows.slice(1, 6).map(row => ({
        name: row[sourceColIndex],
        url: row[urlColIndex]
      })).filter(item => item.name && item.url);

      setCsvPreview(preview);
      setCsvFile(text);
    };

    reader.readAsText(file);
  };

  const processCsvUpload = async () => {
    if (!csvFile) return;

    setIsProcessingCsv(true);
    try {
      const rows = csvFile.split('\n')
        .map(row => row.split(',').map(cell => cell.trim()))
        .filter(row => row.some(cell => cell));
      
      const headers = rows[0];
      const sourceColIndex = headers.findIndex(h => h.toLowerCase() === 'source');
      const urlColIndex = headers.findIndex(h => h.toLowerCase() === 'url');

      if (sourceColIndex === -1 || urlColIndex === -1) {
        toast.error("CSV must have 'Source' and 'URL' columns");
        setIsProcessingCsv(false);
        return;
      }

      const sourcesToCreate = rows.slice(1)
        .map(row => ({
          name: row[sourceColIndex],
          url: row[urlColIndex],
          category: "General",
          description: ""
        }))
        .filter(item => item.name && item.url);

      if (sourcesToCreate.length === 0) {
        toast.error("No valid sources found in CSV");
        setIsProcessingCsv(false);
        return;
      }

      // Create sources one by one to catch individual errors
      let successCount = 0;
      const errors = [];
      
      for (const source of sourcesToCreate) {
        try {
          await base44.entities.Source.create(source);
          successCount++;
        } catch (err) {
          errors.push({ source: source.name, error: err.message });
        }
      }
      
      await queryClient.invalidateQueries({ queryKey: ['sources'] });
      
      if (successCount > 0) {
        toast.success(`✓ ${successCount} sources created! Note: Go to Admin Dashboard → Source Scraper to fetch newsletters.`);
      }
      
      if (errors.length > 0) {
        console.error("Failed sources:", errors);
        toast.error(`Failed to create ${errors.length} sources. Check console.`);
      }
      
      setShowBulkUpload(false);
      setCsvFile(null);
      setCsvPreview([]);
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
      console.error("CSV Upload Error:", error);
    }
    setIsProcessingCsv(false);
  };

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
    if (!source || typeof source !== 'object') return acc;
    const cat = source.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(source);
    return acc;
  }, {});

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Manage Sources</h1>
          <p className="text-slate-600 text-lg">Organize and categorize your newsletter sources</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={showDeleted ? "default" : "outline"} 
            onClick={() => setShowDeleted(!showDeleted)}
            className={showDeleted ? "bg-amber-600 hover:bg-amber-700" : ""}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {showDeleted ? "Hide" : "Show"} Deleted ({deletedSources.length})
          </Button>
          <Button onClick={() => setShowBulkUpload(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Bulk Upload CSV
          </Button>
          <Button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Source
          </Button>
        </div>
      </div>

      {showBulkUpload && (
        <Card className="mb-6 bg-purple-50 border-purple-200">
          <CardHeader>
            <CardTitle>Bulk Upload Sources from CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-purple-100 p-3 rounded-lg text-sm text-purple-900">
              <p className="font-semibold mb-1">CSV Format Required:</p>
              <p>Your CSV must have two columns: <strong>Source</strong> and <strong>URL</strong></p>
              <p className="text-xs mt-1 opacity-75">Example: Source,URL</p>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-900 border border-blue-200">
              <p className="font-semibold mb-1">⚠️ Two-Step Process:</p>
              <p className="text-xs">
                1. This uploads source records to the database<br/>
                2. Go to <strong>Admin Dashboard → Source Scraper</strong> to fetch newsletters from these sources
              </p>
            </div>
            
            <Input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="cursor-pointer"
            />

            {csvPreview.length > 0 && (
              <div className="border rounded-lg p-3 bg-white">
                <p className="text-sm font-semibold mb-2">Preview (first 5 rows):</p>
                <div className="space-y-1">
                  {csvPreview.map((item, idx) => (
                    <div key={idx} className="text-xs flex gap-2">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-blue-600 truncate">{item.url}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={processCsvUpload} 
                disabled={!csvFile || isProcessingCsv}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isProcessingCsv ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Sources
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowBulkUpload(false);
                  setCsvFile(null);
                  setCsvPreview([]);
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
      </div>
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
    </RoleGuard>
  );
}