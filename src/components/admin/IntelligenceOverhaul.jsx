import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { base44 } from "@/api/base44Client";
import { Loader2, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function IntelligenceOverhaul() {
  const [processing, setProcessing] = React.useState(false);
  const [stats, setStats] = React.useState({
    total: 0,
    analyzed: 0,
    pending: 0
  });
  const [scrapeProgress, setScrapeProgress] = React.useState({
    total: 0,
    completed: 0,
    running: 0,
    failed: 0
  });
  const [isPolling, setIsPolling] = React.useState(false);

  // Fetch current stats
  const fetchStats = React.useCallback(async () => {
    try {
      const newsletters = await base44.entities.Newsletter.list('-created_date', 10000);
      const analyzed = newsletters.filter(n => n.is_analyzed).length;
      const total = newsletters.length;
      
      setStats({
        total,
        analyzed,
        pending: total - analyzed
      });

      // Fetch sources and scrape job progress
      const sources = await base44.entities.Source.list("name", 1000);
      const activeSources = sources.filter(s => !s.is_deleted && s.url);
      
      const jobs = await base44.entities.ScrapeJob.list('-created_date', 1000);
      const completed = jobs.filter(j => j.status === 'completed').length;
      const running = jobs.filter(j => j.status === 'running').length;
      const failed = jobs.filter(j => j.status === 'failed').length;
      
      setScrapeProgress({
        total: activeSources.length,
        completed,
        running,
        failed
      });

      // Auto-poll if jobs are running
      if (running > 0 && !isPolling) {
        setIsPolling(true);
      } else if (running === 0 && isPolling) {
        setIsPolling(false);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [isPolling]);

  // Initial fetch
  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Start polling when processing or when jobs are running
  React.useEffect(() => {
    let interval;
    if (isPolling || scrapeProgress.running > 0) {
      interval = setInterval(() => {
        fetchStats();
      }, 5000); // Poll every 5 seconds
    }
    return () => clearInterval(interval);
  }, [isPolling, scrapeProgress.running, fetchStats]);

  const handleStartProcessing = async () => {
    setProcessing(true);
    setIsPolling(true);

    try {
      const response = await base44.functions.invoke('processPendingNewsletters');
      
      if (response.data?.success) {
        await fetchStats();
        toast.success(
          `Processing complete! ${response.data.processed} newsletters analyzed, ${response.data.skipped} skipped.`
        );
      } else {
        toast.error('Processing failed. Check logs for details.');
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
      setIsPolling(false);
      await fetchStats();
    }
  };

  const handleScrapeAllSources = async () => {
    setProcessing(true);
    setIsPolling(true);

    try {
      const response = await base44.functions.invoke('scrapeAllSources');
      
      if (response.data?.success) {
        toast.success(
          `Scraping ${response.data.total_sources} sources in background! Check progress below.`
        );
        await fetchStats();
      } else {
        toast.error('Failed to start scraping');
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const progressPercent = stats.total > 0 ? (stats.analyzed / stats.total) * 100 : 0;

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-600" />
          Intelligence Overhaul
        </CardTitle>
        <CardDescription>
          Batch analyze pending newsletters to extract insights automatically
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-3 border border-indigo-100">
            <p className="text-xs text-slate-600 font-medium">Total</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <p className="text-xs text-slate-600 font-medium">Analyzed</p>
            <p className="text-2xl font-bold text-green-600">{stats.analyzed}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-orange-100">
            <p className="text-xs text-slate-600 font-medium">Pending</p>
            <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Progress: {stats.analyzed} / {stats.total}
            </span>
            {progressPercent === 100 && !processing && (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
          </div>
          <Progress 
            value={progressPercent} 
            className="h-3 bg-indigo-100"
          />
          <p className="text-xs text-slate-600">
            {progressPercent.toFixed(1)}% complete
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleStartProcessing}
            disabled={processing || stats.pending === 0}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing {stats.analyzed} / {stats.total}...
              </>
            ) : stats.pending === 0 ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                All Newsletters Analyzed
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Start Batch Processing
              </>
            )}
          </Button>

          {stats.total === 0 && (
            <Button
              onClick={handleScrapeAllSources}
              disabled={processing}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scraping Sources...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Scrape All 525 Sources First
                </>
              )}
            </Button>
          )}
        </div>

        {/* Scrape Progress */}
        {scrapeProgress.total > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-700">Source Scraping Progress</p>
                {scrapeProgress.running > 0 && (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                )}
              </div>
              {scrapeProgress.running > 0 && (
                <span className="text-xs text-blue-600 font-medium">
                  Auto-refreshing every 5s
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="bg-white p-2 rounded border border-slate-200">
                <p className="text-slate-600">Total</p>
                <p className="font-bold text-slate-900">{scrapeProgress.total}</p>
              </div>
              <div className="bg-white p-2 rounded border border-green-200">
                <p className="text-slate-600">Done</p>
                <p className="font-bold text-green-600">{scrapeProgress.completed}</p>
              </div>
              <div className="bg-white p-2 rounded border border-blue-200">
                <p className="text-slate-600">Running</p>
                <p className="font-bold text-blue-600">{scrapeProgress.running}</p>
              </div>
              <div className="bg-white p-2 rounded border border-red-200">
                <p className="text-slate-600">Failed</p>
                <p className="font-bold text-red-600">{scrapeProgress.failed}</p>
              </div>
            </div>
          </div>
        )}

        {processing && (
          <p className="text-xs text-slate-600 text-center">
            {stats.pending > 0 
              ? `Real-time progress updates • Processing ${stats.pending} remaining newsletters`
              : 'Starting background scrape...'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}