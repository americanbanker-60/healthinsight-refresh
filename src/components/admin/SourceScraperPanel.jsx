import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function SourceScraperPanel() {
  const queryClient = useQueryClient();
  const [scrapingStatus, setScrapingStatus] = useState({});

  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: () => base44.entities.Source.list("name"),
    initialData: [],
  });

  const scrapeMutation = useMutation({
    mutationFn: async (sourceId) => {
      const response = await base44.functions.invoke('scrapeSource', { source_id: sourceId });
      return response.data;
    },
    onSuccess: (data, sourceId) => {
      setScrapingStatus(prev => ({
        ...prev,
        [sourceId]: { status: 'success', data, timestamp: Date.now() }
      }));
      queryClient.invalidateQueries({ queryKey: ['all-newsletters'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      
      if (data.new_count > 0) {
        toast.success(`${data.source_name}: Found ${data.new_count} new newsletter(s)!`);
      } else {
        toast.info(`${data.source_name}: No new content found`);
      }
    },
    onError: (error, sourceId) => {
      setScrapingStatus(prev => ({
        ...prev,
        [sourceId]: { status: 'error', error: error.message, timestamp: Date.now() }
      }));
      toast.error(`Failed to scrape source: ${error.message}`);
    },
  });

  const scrapeAllMutation = useMutation({
    mutationFn: async () => {
      const activeSources = sources.filter(s => !s.is_deleted && s.url);
      const results = [];
      
      for (const source of activeSources) {
        setScrapingStatus(prev => ({
          ...prev,
          [source.id]: { status: 'loading', timestamp: Date.now() }
        }));
        
        try {
          const response = await base44.functions.invoke('scrapeSource', { source_id: source.id });
          results.push({ source: source.name, ...response.data });
          setScrapingStatus(prev => ({
            ...prev,
            [source.id]: { status: 'success', data: response.data, timestamp: Date.now() }
          }));
        } catch (error) {
          results.push({ source: source.name, error: error.message });
          setScrapingStatus(prev => ({
            ...prev,
            [source.id]: { status: 'error', error: error.message, timestamp: Date.now() }
          }));
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['all-newsletters'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      
      const totalNew = results.reduce((sum, r) => sum + (r.new_count || 0), 0);
      if (totalNew > 0) {
        toast.success(`Scraping complete! Found ${totalNew} new newsletters across all sources.`);
      } else {
        toast.info('Scraping complete. No new content found.');
      }
    },
    onError: (error) => {
      toast.error('Bulk scraping failed: ' + error.message);
    },
  });

  const activeSources = sources.filter(s => !s.is_deleted && s.url);
  const isAnyLoading = Object.values(scrapingStatus).some(s => s.status === 'loading') || 
                       scrapeMutation.isPending || 
                       scrapeAllMutation.isPending;

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
      <CardHeader className="border-b border-slate-200/60">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              Newsletter Source Scraper
            </CardTitle>
            <CardDescription className="mt-1">
              Check sources for new newsletters and automatically import them
            </CardDescription>
          </div>
          <Button
            onClick={() => scrapeAllMutation.mutate()}
            disabled={isAnyLoading || activeSources.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {scrapeAllMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scraping All...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Check All Sources
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {activeSources.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No sources with URLs configured. Add source URLs in Manage Sources.
          </div>
        ) : (
          <div className="space-y-3">
            {activeSources.map((source) => {
              const status = scrapingStatus[source.id];
              const isLoading = status?.status === 'loading' || 
                              (scrapeMutation.isPending && scrapeMutation.variables === source.id);
              
              return (
                <div key={source.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-slate-900">{source.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {source.category || "General"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{source.url}</p>
                    
                    {status && (
                      <div className="mt-2 flex items-center gap-2">
                        {status.status === 'success' && (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-green-700">
                              {status.data.new_count > 0 
                                ? `Found ${status.data.new_count} new newsletter(s)` 
                                : 'No new content'}
                            </span>
                          </>
                        )}
                        {status.status === 'error' && (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-xs text-red-700">Error: {status.error}</span>
                          </>
                        )}
                        {status.status === 'loading' && (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            <span className="text-xs text-blue-700">Checking...</span>
                          </>
                        )}
                        {status.timestamp && (
                          <span className="text-xs text-slate-400 ml-2">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(status.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => scrapeMutation.mutate(source.id)}
                    disabled={isAnyLoading}
                    variant="outline"
                    size="sm"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}