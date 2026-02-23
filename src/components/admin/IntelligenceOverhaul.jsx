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
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  // Initial fetch
  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Start polling when processing
  React.useEffect(() => {
    let interval;
    if (isPolling) {
      interval = setInterval(() => {
        fetchStats();
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isPolling, fetchStats]);

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
      // Set a timeout since scraping can take a while
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Scraping timed out after 10 minutes')), 600000)
      );
      
      const response = await Promise.race([
        base44.functions.invoke('scrapeAllSources'),
        timeoutPromise
      ]);
      
      if (response.data?.success) {
        // Wait a moment for stats to update, then poll
        setTimeout(() => fetchStats(), 1000);
        
        toast.success(
          `Scraping started! ${response.data.processed} sources scraped. Newsletters will populate shortly.`
        );
      } else {
        toast.error('Scraping failed. Check logs for details.');
      }
    } catch (error) {
      toast.error(`Scraping error: ${error.message}`);
    } finally {
      setProcessing(false);
      setIsPolling(false);
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

        {processing && (
          <p className="text-xs text-slate-600 text-center">
            {stats.pending > 0 
              ? `Real-time progress updates • Processing ${stats.pending} remaining newsletters`
              : 'Scraping sources and creating newsletters...'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}