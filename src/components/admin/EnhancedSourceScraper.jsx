import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, Clock, Calendar, History, Play } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function EnhancedSourceScraper() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("scraper");
  const [bulkScraping, setBulkScraping] = useState(false);

  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: () => base44.entities.Source.list("name"),
    initialData: [],
  });

  const { data: scrapeHistory = [], refetch: refetchHistory } = useQuery({
    queryKey: ['scrapeHistory'],
    queryFn: () => base44.entities.ScrapeJob.list("-created_date", 1000),
    initialData: [],
    refetchInterval: bulkScraping ? 5000 : false, // Auto-refresh every 5s during bulk scrape
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['scrapeSchedules'],
    queryFn: () => base44.entities.ScheduledScrape.list("source_name"),
    initialData: [],
  });

  const activeSources = sources.filter(s => !s.is_deleted && s.url);
  
  // Calculate bulk scrape progress
  const bulkProgress = React.useMemo(() => {
    if (scrapeHistory.length === 0 || activeSources.length === 0) {
      return { completed: 0, total: 0, running: 0, failed: 0, pending: 0, percentage: 0 };
    }
    
    const completed = scrapeHistory.filter(j => j.status === 'completed').length;
    const running = scrapeHistory.filter(j => j.status === 'running').length;
    const failed = scrapeHistory.filter(j => j.status === 'failed').length;
    const pending = scrapeHistory.filter(j => j.status === 'pending').length;
    
    return {
      completed,
      running,
      failed,
      pending,
      total: activeSources.length,
      percentage: Math.round((completed / activeSources.length) * 100)
    };
  }, [scrapeHistory, activeSources]);

  const scrapeMutation = useMutation({
    mutationFn: async ({ sourceId, sourceName }) => {
      // Create job record
      const job = await base44.entities.ScrapeJob.create({
        source_id: sourceId,
        source_name: sourceName,
        status: "running",
        started_at: new Date().toISOString(),
        triggered_by: "manual"
      });

      try {
        // Run scrape
        const response = await base44.functions.invoke('scrapeSource', { source_id: sourceId });
        
        // Update job record
        await base44.entities.ScrapeJob.update(job.id, {
          status: "completed",
          completed_at: new Date().toISOString(),
          newsletters_found: response.data.newsletters?.length || 0,
          newsletters_created: response.data.new_count || 0,
          metadata: {
            topic_assignments: response.data.topic_assignments?.length || 0,
            new_topics: response.data.new_topic_suggestions?.length || 0,
            companies_created: response.data.companies_created?.length || 0
          }
        });

        return { ...response.data, jobId: job.id };
      } catch (error) {
        // Update job with error
        await base44.entities.ScrapeJob.update(job.id, {
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: error.message
        });
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scrapeHistory'] });
      queryClient.invalidateQueries({ queryKey: ['all-newsletters'] });
      
      if (data.new_count > 0) {
        toast.success(`✓ Found ${data.new_count} new newsletter(s)!`);
      } else {
        toast.info("No new content found");
      }
    },
    onError: (error) => {
      toast.error(`Scrape failed: ${error.message}`);
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: async ({ sourceId, sourceName, frequency }) => {
      const now = new Date();
      let nextRun = new Date(now);
      
      switch (frequency) {
        case "hourly":
          nextRun.setHours(nextRun.getHours() + 1);
          break;
        case "daily":
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        case "weekly":
          nextRun.setDate(nextRun.getDate() + 7);
          break;
        case "monthly":
          nextRun.setMonth(nextRun.getMonth() + 1);
          break;
      }

      return await base44.entities.ScheduledScrape.create({
        source_id: sourceId,
        source_name: sourceName,
        frequency,
        next_run: nextRun.toISOString(),
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrapeSchedules'] });
      toast.success("Schedule created successfully");
    },
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: async ({ scheduleId, isActive }) => {
      return await base44.entities.ScheduledScrape.update(scheduleId, { is_active: !isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrapeSchedules'] });
    },
  });

  const startBulkScrapeMutation = useMutation({
    mutationFn: async (resume = false) => {
      const response = await base44.functions.invoke('scrapeAllSources', { resume });
      return response.data;
    },
    onSuccess: (data) => {
      setBulkScraping(true);
      toast.success(`Processing ${data.total_jobs} sources (Est: ${data.estimated_time_minutes} min)`);
      refetchHistory();
    },
    onError: (error) => {
      toast.error(`Bulk scrape failed: ${error.message}`);
    },
  });

  // Auto-stop polling when bulk scrape completes
  React.useEffect(() => {
    if (bulkScraping && bulkProgress.running === 0 && bulkProgress.pending === 0) {
      setBulkScraping(false);
      toast.success(`Bulk scrape complete! ${bulkProgress.completed} succeeded, ${bulkProgress.failed} failed`);
    }
  }, [bulkProgress, bulkScraping]);

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
      <CardHeader className="border-b border-slate-200/60">
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-blue-600" />
          Source Scraper
        </CardTitle>
        <CardDescription>
          Scrape sources for newsletters, schedule automatic checks, and view history
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        
        {/* Bulk Scrape Controls */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-slate-900">Mass Source Processing</h3>
              <p className="text-xs text-slate-600 mt-1">
                Process all {activeSources.length} sources with chunked background execution
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => startBulkScrapeMutation.mutate(false)}
                disabled={bulkScraping || startBulkScrapeMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {bulkScraping ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Start Bulk Scrape
                  </>
                )}
              </Button>
              {(bulkProgress.pending > 0 || bulkProgress.failed > 0) && (
                <Button
                  onClick={() => startBulkScrapeMutation.mutate(true)}
                  disabled={bulkScraping || startBulkScrapeMutation.isPending}
                  variant="outline"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume ({bulkProgress.pending + bulkProgress.failed})
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {bulkProgress.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Progress: {bulkProgress.completed} / {bulkProgress.total}</span>
                <span>{bulkProgress.percentage}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2.5 transition-all duration-500"
                  style={{ width: `${bulkProgress.percentage}%` }}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3">
                <div className="bg-white rounded p-2 text-center border border-green-200">
                  <p className="text-xs text-slate-600">Completed</p>
                  <p className="text-lg font-bold text-green-600">{bulkProgress.completed}</p>
                </div>
                <div className="bg-white rounded p-2 text-center border border-blue-200">
                  <p className="text-xs text-slate-600">Running</p>
                  <p className="text-lg font-bold text-blue-600">{bulkProgress.running}</p>
                </div>
                <div className="bg-white rounded p-2 text-center border border-amber-200">
                  <p className="text-xs text-slate-600">Pending</p>
                  <p className="text-lg font-bold text-amber-600">{bulkProgress.pending}</p>
                </div>
                <div className="bg-white rounded p-2 text-center border border-red-200">
                  <p className="text-xs text-slate-600">Failed</p>
                  <p className="text-lg font-bold text-red-600">{bulkProgress.failed}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scraper">
              <Play className="w-4 h-4 mr-2" />
              Scrape Now
            </TabsTrigger>
            <TabsTrigger value="schedules">
              <Calendar className="w-4 h-4 mr-2" />
              Schedules
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scraper" className="space-y-4 mt-4">
            {activeSources.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No sources configured. Add sources in Manage Sources.
              </div>
            ) : (
              <div className="space-y-3">
                {activeSources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-slate-900">{source.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {source.category || "General"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{source.url}</p>
                    </div>
                    <Button
                      onClick={() => scrapeMutation.mutate({ sourceId: source.id, sourceName: source.name })}
                      disabled={scrapeMutation.isPending}
                      variant="outline"
                      size="sm"
                    >
                      {scrapeMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="schedules" className="space-y-4 mt-4">
            <ScheduleManager
              sources={activeSources}
              schedules={schedules}
              onCreateSchedule={createScheduleMutation.mutate}
              onToggleSchedule={toggleScheduleMutation.mutate}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <ScrapeHistory history={scrapeHistory} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ScheduleManager({ sources, schedules, onCreateSchedule, onToggleSchedule }) {
  const [selectedSource, setSelectedSource] = useState("");
  const [frequency, setFrequency] = useState("daily");

  const handleCreate = () => {
    if (!selectedSource) return;
    const source = sources.find(s => s.id === selectedSource);
    if (source) {
      onCreateSchedule({ sourceId: source.id, sourceName: source.name, frequency });
      setSelectedSource("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={selectedSource} onValueChange={setSelectedSource}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select source..." />
          </SelectTrigger>
          <SelectContent>
            {sources.map(source => (
              <SelectItem key={source.id} value={source.id}>
                {source.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={frequency} onValueChange={setFrequency}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hourly">Hourly</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleCreate} disabled={!selectedSource}>
          <Calendar className="w-4 h-4 mr-2" />
          Schedule
        </Button>
      </div>

      <div className="space-y-2">
        {schedules.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No schedules configured</p>
        ) : (
          schedules.map(schedule => (
            <div
              key={schedule.id}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200"
            >
              <div className="flex-1">
                <p className="font-medium text-sm">{schedule.source_name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <Badge variant={schedule.is_active ? "default" : "secondary"} className="text-xs">
                    {schedule.frequency}
                  </Badge>
                  {schedule.next_run && (
                    <span className="text-xs text-slate-500">
                      Next: {format(new Date(schedule.next_run), "MMM d, h:mm a")}
                    </span>
                  )}
                </div>
              </div>
              <Button
                onClick={() => onToggleSchedule({ scheduleId: schedule.id, isActive: schedule.is_active })}
                variant={schedule.is_active ? "outline" : "default"}
                size="sm"
              >
                {schedule.is_active ? "Pause" : "Resume"}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ScrapeHistory({ history }) {
  if (history.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-4">No scrape history yet</p>;
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {history.map(job => (
        <div
          key={job.id}
          className="flex items-center justify-between p-3 rounded-lg border border-slate-200"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm">{job.source_name}</h4>
              {job.status === "completed" && (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              )}
              {job.status === "failed" && (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              {job.status === "running" && (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(job.created_date), "MMM d, h:mm a")}
              </span>
              {job.status === "completed" && (
                <>
                  <span>Found: {job.newsletters_found || 0}</span>
                  <span>New: {job.newsletters_created || 0}</span>
                  {job.metadata?.companies_created > 0 && (
                    <span>Companies: {job.metadata.companies_created}</span>
                  )}
                </>
              )}
              {job.status === "failed" && (
                <span className="text-red-600">{job.error_message}</span>
              )}
            </div>
          </div>
          <Badge variant={
            job.status === "completed" ? "default" :
            job.status === "failed" ? "destructive" :
            "secondary"
          }>
            {job.triggered_by}
          </Badge>
        </div>
      ))}
    </div>
  );
}