import React, { useState, useMemo, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Play, RefreshCw, FileSpreadsheet, RotateCcw, ExternalLink, Zap } from "lucide-react";
import { toast } from "sonner";

export default function BulkImportStatus() {
  const [isActivelyProcessing, setIsActivelyProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const processingRef = useRef(false);
  const queryClient = useQueryClient();

  const { data: allJobs = [], refetch } = useQuery({
    queryKey: ['bulkImportJobs'],
    queryFn: () => base44.entities.BulkImportJob.list('-created_date', 2000),
    refetchInterval: isActivelyProcessing ? 3000 : 15000,
    initialData: []
  });

  const batches = useMemo(() => {
    const map = {};
    for (const job of allJobs) {
      if (!map[job.batch_id]) {
        map[job.batch_id] = {
          id: job.batch_id,
          name: job.batch_name || job.batch_id,
          created: job.created_date,
          jobs: []
        };
      }
      map[job.batch_id].jobs.push(job);
    }
    return Object.values(map).sort((a, b) => new Date(b.created) - new Date(a.created)).slice(0, 5);
  }, [allJobs]);

  const totalPending = allJobs.filter(j => j.status === 'pending' || j.status === 'processing').length;
  const totalDone = allJobs.filter(j => j.status === 'done').length;
  const totalFailed = allJobs.filter(j => j.status === 'failed').length;

  const triggerProcessing = async () => {
    setTriggering(true);
    try {
      await base44.functions.invoke('processBulkImportQueue', {});
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      toast.success('Processing triggered — check back in a minute for updates');
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const reprocessFailed = async () => {
    const failedJobs = allJobs.filter(j => j.status === 'failed');
    if (failedJobs.length === 0) return;
    await Promise.all(failedJobs.map(j =>
      base44.entities.BulkImportJob.update(j.id, { status: 'pending', error_message: null })
    ));
    queryClient.invalidateQueries({ queryKey: ['bulkImportJobs'] });
    toast.success(`Reset ${failedJobs.length} failed jobs to pending`);
    triggerProcessing();
  };

  if (allJobs.length === 0) return null;

  return (
    <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="w-5 h-5 text-violet-600" />
            Bulk Import Queue
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => refetch()} className="text-slate-500">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Link to={createPageUrl("ManageSources")}>
              <Button size="sm" variant="ghost" className="text-violet-600 text-xs gap-1">
                <ExternalLink className="w-3 h-3" /> Full View
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="flex gap-4 text-sm flex-wrap">
          {totalPending > 0 && (
            <span className="text-blue-700 font-semibold">⏳ {totalPending} pending</span>
          )}
          {totalDone > 0 && (
            <span className="text-green-700 font-semibold">✓ {totalDone} analyzed &amp; saved to database</span>
          )}
          {totalFailed > 0 && (
            <span className="text-red-600">✗ {totalFailed} failed</span>
          )}
        </div>

        {totalDone > 0 && totalPending === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
            <strong>✅ Processing complete!</strong> Your newsletters have been analyzed by AI and are ready to view.
            <div className="flex gap-2 mt-2">
              <Link to={createPageUrl("ExploreAllSources")}>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs">
                  View Analyzed Newsletters →
                </Button>
              </Link>
              <Link to={createPageUrl("Dashboard")}>
                <Button size="sm" variant="outline" className="text-xs border-green-300">
                  Go to Dashboard →
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {totalPending > 0 && (
            <Button
              className="bg-violet-600 hover:bg-violet-700"
              onClick={triggerProcessing}
              disabled={triggering}
            >
              {triggering ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Processing...</>
              ) : (
                <><Play className="w-4 h-4 mr-2" />Process {totalPending} Pending Now</>
              )}
            </Button>
          )}
          {totalFailed > 0 && (
            <Button variant="outline" onClick={reprocessFailed} className="border-orange-300 text-orange-700 hover:bg-orange-50">
              <RotateCcw className="w-4 h-4 mr-2" /> Retry {totalFailed} Failed
            </Button>
          )}
        </div>

        {/* Recent batches */}
        <div className="space-y-2">
          {batches.map(batch => {
            const total = batch.jobs.length;
            const done = batch.jobs.filter(j => j.status === 'done').length;
            const failed = batch.jobs.filter(j => j.status === 'failed').length;
            const pending = batch.jobs.filter(j => j.status === 'pending' || j.status === 'processing').length;
            const pct = total > 0 ? Math.round(((done + failed + batch.jobs.filter(j => j.status === 'skipped').length) / total) * 100) : 0;
            const isComplete = pending === 0;

            return (
              <div key={batch.id} className="bg-white rounded-lg border border-violet-100 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800 truncate">{batch.name}</p>
                  <Badge variant={isComplete ? (failed > 0 ? "destructive" : "default") : "secondary"} className="text-xs ml-2 shrink-0">
                    {isComplete ? (failed > 0 ? `Done (${failed} failed)` : "Complete") : `${pending} left`}
                  </Badge>
                </div>
                <Progress value={pct} className="h-1.5" />
                <p className="text-xs text-slate-500">{total} URLs · {done} added · {failed > 0 ? `${failed} failed · ` : ''}{new Date(batch.created).toLocaleDateString()}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}