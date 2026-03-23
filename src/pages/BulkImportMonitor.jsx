import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Clock, RefreshCw, CheckCircle2, XCircle, SkipForward,
  AlertCircle, RotateCcw, Trash2, Search, ChevronDown, ChevronUp
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const STATUS_CONFIG = {
  pending:      { icon: Clock,        color: "text-slate-500",  bg: "bg-slate-100 text-slate-700 border-slate-300",   label: "Pending" },
  processing:   { icon: RefreshCw,    color: "text-blue-500",   bg: "bg-blue-100 text-blue-700 border-blue-300",      label: "Processing" },
  done:         { icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-100 text-green-700 border-green-300",   label: "Done" },
  failed:       { icon: AlertCircle,  color: "text-amber-600",  bg: "bg-amber-100 text-amber-700 border-amber-300",   label: "Failed" },
  skipped:      { icon: SkipForward,  color: "text-slate-400",  bg: "bg-slate-100 text-slate-500 border-slate-200",   label: "Skipped" },
  "perma-failed": { icon: XCircle,   color: "text-red-600",    bg: "bg-red-100 text-red-700 border-red-300",         label: "Perm. Failed" },
};

function groupByBatch(jobs) {
  const batches = {};
  jobs.forEach(job => {
    const key = job.batch_id || "ungrouped";
    if (!batches[key]) batches[key] = { batch_id: key, batch_name: job.batch_name || key, jobs: [], created_date: job.created_date };
    batches[key].jobs.push(job);
  });
  return Object.values(batches).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <Badge variant="outline" className={`text-xs font-medium border ${cfg.bg}`}>
      {cfg.label}
    </Badge>
  );
}

function BatchRow({ batch, onRetry, onDelete, isRetrying }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");

  const { jobs } = batch;
  const counts = {
    done: jobs.filter(j => j.status === "done").length,
    failed: jobs.filter(j => j.status === "failed").length,
    "perma-failed": jobs.filter(j => j.status === "perma-failed").length,
    skipped: jobs.filter(j => j.status === "skipped").length,
    processing: jobs.filter(j => j.status === "processing").length,
    pending: jobs.filter(j => j.status === "pending").length,
  };
  const total = jobs.length;
  const finished = counts.done + counts.failed + counts["perma-failed"] + counts.skipped;
  const pct = total > 0 ? Math.round((finished / total) * 100) : 0;
  const retryable = jobs.filter(j => j.status === "failed" || j.status === "perma-failed");

  const filteredJobs = search
    ? jobs.filter(j => j.url?.toLowerCase().includes(search.toLowerCase()) || j.result_title?.toLowerCase().includes(search.toLowerCase()))
    : jobs;

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base truncate">{batch.batch_name}</CardTitle>
              <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(batch.created_date), { addSuffix: true })}</span>
            </div>
            <div className="flex gap-3 mt-2 flex-wrap text-xs">
              {counts.done > 0 && <span className="text-green-700 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{counts.done} done</span>}
              {counts.skipped > 0 && <span className="text-slate-500 flex items-center gap-1"><SkipForward className="w-3 h-3" />{counts.skipped} skipped</span>}
              {counts.failed > 0 && <span className="text-amber-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{counts.failed} failed</span>}
              {counts["perma-failed"] > 0 && <span className="text-red-600 font-medium flex items-center gap-1"><XCircle className="w-3 h-3" />{counts["perma-failed"]} perm. failed</span>}
              {counts.processing > 0 && <span className="text-blue-600 font-medium flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" />{counts.processing} processing</span>}
              {counts.pending > 0 && <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{counts.pending} pending</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {retryable.length > 0 && (
              <Button size="sm" variant="outline" className="text-xs h-7 border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={e => { e.stopPropagation(); onRetry(retryable); }}
                disabled={isRetrying}>
                <RotateCcw className="w-3 h-3 mr-1" />Retry {retryable.length}
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-xs h-7 text-slate-400 hover:text-red-600"
              onClick={e => { e.stopPropagation(); onDelete(batch.batch_id); }}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
        <Progress value={pct} className="h-1.5 mt-2" />
        <p className="text-xs text-slate-400 mt-1">{pct}% complete — {finished} of {total} processed</p>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input placeholder="Filter URLs..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {filteredJobs.map(job => {
              const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <div key={job.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-sm">
                  <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color} ${job.status === "processing" ? "animate-spin" : ""}`} />
                  <div className="flex-1 min-w-0">
                    {job.result_title
                      ? <p className="font-medium text-slate-800 truncate">{job.result_title}</p>
                      : <p className="font-mono text-xs text-slate-500 truncate">{job.url}</p>}
                    {job.result_title && <p className="font-mono text-xs text-slate-400 truncate mt-0.5">{job.url}</p>}
                    {job.error_message && <p className="text-xs text-red-600 mt-0.5 line-clamp-2">{job.error_message}</p>}
                  </div>
                  <StatusBadge status={job.status} />
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function BulkImportMonitor() {
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["bulkImportJobs"],
    queryFn: () => base44.entities.BulkImportJob.list("-created_date", 500),
    refetchInterval: 10000,
  });

  const retryMutation = useMutation({
    mutationFn: async (failedJobs) => {
      await Promise.all(failedJobs.map(job =>
        base44.entities.BulkImportJob.update(job.id, { status: "pending", error_message: null, retry_count: 0 })
      ));
    },
    onSuccess: (_, failedJobs) => {
      toast.success(`${failedJobs.length} job${failedJobs.length !== 1 ? "s" : ""} queued for retry`);
      queryClient.invalidateQueries({ queryKey: ["bulkImportJobs"] });
    },
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId) => {
      const batchJobs = jobs.filter(j => (j.batch_id || "ungrouped") === batchId);
      await Promise.all(batchJobs.map(j => base44.entities.BulkImportJob.delete(j.id)));
    },
    onSuccess: () => {
      toast.success("Batch deleted");
      queryClient.invalidateQueries({ queryKey: ["bulkImportJobs"] });
    },
  });

  const batches = groupByBatch(jobs);

  const totalStats = {
    done: jobs.filter(j => j.status === "done").length,
    failed: jobs.filter(j => j.status === "failed" || j.status === "perma-failed").length,
    pending: jobs.filter(j => j.status === "pending" || j.status === "processing").length,
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Bulk Import Monitor</h1>
        <p className="text-slate-500 mt-1">Track the status of all bulk article import jobs</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Completed", value: totalStats.done, color: "text-green-600", bg: "bg-green-50 border-green-200" },
          { label: "In Queue", value: totalStats.pending, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
          { label: "Failed", value: totalStats.failed, color: "text-red-600", bg: "bg-red-50 border-red-200" },
        ].map(stat => (
          <div key={stat.label} className={`rounded-xl border p-4 ${stat.bg}`}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-slate-600 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No import jobs found</p>
          <p className="text-sm mt-1">Bulk imports from the CSV uploader will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {batches.map(batch => (
            <BatchRow
              key={batch.batch_id}
              batch={batch}
              onRetry={(failedJobs) => retryMutation.mutate(failedJobs)}
              onDelete={(batchId) => deleteBatchMutation.mutate(batchId)}
              isRetrying={retryMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}