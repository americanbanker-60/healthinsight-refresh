import React from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, Play, Trash2, Calendar, Filter } from "lucide-react";
import { toast } from "sonner";
import EmptyState from "../common/EmptyState";

export default function SavedSearchesSection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: savedSearches = [] } = useQuery({
    queryKey: ['savedSearches'],
    queryFn: async () => {
      return await base44.entities.SavedSearch.filter(
        { created_by: user.email },
        "-created_date"
      );
    },
    enabled: !!user,
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedSearch.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches'] });
      toast.success("Search deleted");
    },
  });

  const runSearch = (search) => {
    const params = new URLSearchParams();
    if (search.keywords) params.set('keywords', search.keywords);
    if (search.date_range_type) params.set('date_range', search.date_range_type);
    if (search.custom_start_date) params.set('start_date', search.custom_start_date);
    if (search.custom_end_date) params.set('end_date', search.custom_end_date);
    if (search.sources_selected?.length) params.set('sources', search.sources_selected.join(','));
    if (search.topics_selected?.length) params.set('topics', search.topics_selected.join(','));
    
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  if (savedSearches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Saved Searches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Search}
            title="No Saved Searches"
            description="Run a search and click 'Save This Search' to get started"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Saved Searches
          </CardTitle>
          <Badge variant="outline">{savedSearches.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {savedSearches.map(search => (
            <Card key={search.id} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm mb-2">{search.search_name}</h4>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      {search.keywords && (
                        <div className="flex items-center gap-1">
                          <Search className="w-3 h-3" />
                          <span className="italic">"{search.keywords}"</span>
                        </div>
                      )}
                      {search.date_range_type && (
                        <Badge variant="secondary" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          {search.date_range_type === "7d" ? "7 days" : 
                           search.date_range_type === "30d" ? "30 days" : 
                           search.date_range_type === "90d" ? "90 days" : "YTD"}
                        </Badge>
                      )}
                      {search.sources_selected?.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Filter className="w-3 h-3 mr-1" />
                          {search.sources_selected.length} sources
                        </Badge>
                      )}
                      {search.topics_selected?.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {search.topics_selected.length} topics
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => runSearch(search)}
                      className="gap-1"
                    >
                      <Play className="w-3 h-3" />
                      Run
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(search.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}