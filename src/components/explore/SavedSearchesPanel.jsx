import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Play, Trash2, Bookmark } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function SavedSearchesPanel({ currentSearch, onLoadSearch }) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const queryClient = useQueryClient();

  const { data: savedSearches = [] } = useQuery({
    queryKey: ['savedSearches'],
    queryFn: () => base44.entities.SavedSearch.list("-created_date"),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SavedSearch.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches'] });
      setShowSaveDialog(false);
      setSearchName("");
      toast.success("Search saved!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedSearch.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches'] });
      setDeleteConfirmId(null);
      toast.success("Search deleted");
    },
  });

  const handleSaveSearch = () => {
    if (!searchName.trim()) {
      toast.error("Please enter a search name");
      return;
    }

    createMutation.mutate({
      search_name: searchName,
      keywords: currentSearch.keywords,
      date_range_type: currentSearch.dateRangeType,
      custom_start_date: currentSearch.customStartDate,
      custom_end_date: currentSearch.customEndDate,
      sources_selected: currentSearch.sourcesSelected,
      topics_selected: currentSearch.topicsSelected,
    });
  };

  return (
    <>
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
        <CardHeader className="border-b border-slate-200/60">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-blue-600" />
              Saved Searches
            </CardTitle>
            <Button
              onClick={() => setShowSaveDialog(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Current
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {savedSearches.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <Bookmark className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No saved searches yet</p>
              <p className="text-xs mt-1">Run a search and click "Save Current" to create one</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedSearches.map(search => (
                <div
                  key={search.id}
                  className="border border-slate-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 text-sm">{search.search_name}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(search.created_date), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  
                  {search.keywords && (
                    <Badge variant="outline" className="text-xs mb-2">
                      "{search.keywords}"
                    </Badge>
                  )}
                  
                  <div className="flex gap-2 mt-2">
                    <Button
                      onClick={() => onLoadSearch(search)}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Run
                    </Button>
                    <Button
                      onClick={() => setDeleteConfirmId(search.id)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter a name for this search..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveSearch()}
            />
            {currentSearch.keywords && (
              <p className="text-sm text-slate-600 mt-2">
                Keywords: "{currentSearch.keywords}"
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSearch} disabled={createMutation.isPending}>
              Save Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Saved Search?</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}