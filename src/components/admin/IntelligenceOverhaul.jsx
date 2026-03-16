import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { base44 } from "@/api/base44Client";
import { Loader2, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function IntelligenceOverhaul() {
  const [processing, setProcessing] = React.useState(false);
  const [stats, setStats] = React.useState({ total: 0, analyzed: 0, pending: 0 });
  const [isPolling, setIsPolling] = React.useState(false);

  const fetchStats = React.useCallback(async () => {
    try {
      const newsletters = await base44.entities.NewsletterItem.list('-created_date', 10000);
      const analyzed = newsletters.filter(n => n.is_analyzed).length;
      const total = newsletters.length;
      setStats({ total, analyzed, pending: total - analyzed });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  React.useEffect(() => {
    let interval;
    if (isPolling || processing) {
      interval = setInterval(fetchStats, 8000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isPolling, processing, fetchStats]);

  const handleStartProcessing = async () => {
    setProcessing(true);
    setIsPolling(true);

    base44.functions.invoke('processPendingNewsletters').then((response) => {
      if (response.data?.success) {
        toast.success(`Batch complete! ${response.data.processed} analyzed, ${response.data.skipped} skipped.`);
      }
      setProcessing(false);
      fetchStats();
    }).catch((error) => {
      toast.error(`Error: ${error.message}`);
      setProcessing(false);
      setIsPolling(false);
    });

    toast.success('Batch processing started! Progress will update automatically.');
    await fetchStats();
  };

  const progressPercent = stats.total > 0 ? (stats.analyzed / stats.total) * 100 : 0;

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-600" />
          Re-analyze Newsletters
        </CardTitle>
        <CardDescription>
          Batch re-analyze newsletters that are missing AI insights
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Progress: {stats.analyzed} / {stats.total}
            </span>
            {progressPercent === 100 && !processing && (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
          </div>
          <Progress value={progressPercent} className="h-3 bg-indigo-100" />
          <p className="text-xs text-slate-600">{progressPercent.toFixed(1)}% complete</p>
        </div>

        <Button
          onClick={handleStartProcessing}
          disabled={processing || stats.pending === 0}
          className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white"
        >
          {processing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing {stats.analyzed} / {stats.total}...</>
          ) : stats.pending === 0 ? (
            <><CheckCircle2 className="w-4 h-4 mr-2" />All Newsletters Analyzed</>
          ) : (
            <><Zap className="w-4 h-4 mr-2" />Start Batch Processing</>
          )}
        </Button>

        {processing && (
          <p className="text-xs text-slate-500 text-center">
            Processing in background · {stats.pending} remaining · Safe to navigate away
          </p>
        )}
      </CardContent>
    </Card>
  );
}