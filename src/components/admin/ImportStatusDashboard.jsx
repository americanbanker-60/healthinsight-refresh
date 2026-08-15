import React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, RefreshCw, CheckCircle2, SkipForward, XCircle, Loader2 } from "lucide-react";

/**
 * Clear at-a-glance status dashboard for URL imports.
 * Shows three states the user cares about: Pending, In Progress, Finished.
 */
export default function ImportStatusDashboard({ jobs, lastUpdated }) {
  const total = jobs.length;
  const pending = jobs.filter(j => j.status === "pending").length;
  const inProgress = jobs.filter(j => j.status === "processing").length;
  const done = jobs.filter(j => j.status === "done").length;
  const skipped = jobs.filter(j => j.status === "skipped").length;
  const failed = jobs.filter(j => j.status === "failed" || j.status === "perma-failed").length;
  const finished = done + skipped + failed;
  const pct = total > 0 ? Math.round((finished / total) * 100) : 0;

  const tiles = [
    {
      label: "Pending",
      value: pending,
      sub: "queued, waiting for worker",
      icon: Clock,
      color: "text-slate-600",
      ring: "bg-slate-100",
      border: "border-slate-200",
    },
    {
      label: "In Progress",
      value: inProgress,
      sub: "being analyzed now",
      icon: RefreshCw,
      color: "text-blue-600",
      ring: "bg-blue-100",
      border: "border-blue-200",
      spin: true,
    },
    {
      label: "Finished",
      value: finished,
      sub: `${done} done · ${skipped} skipped · ${failed} failed`,
      icon: CheckCircle2,
      color: "text-green-600",
      ring: "bg-green-100",
      border: "border-green-200",
    },
  ];

  return (
    <Card className={`border-slate-200 p-5 mb-6 ${inProgress > 0 ? "ring-2 ring-blue-200" : ""}`}>
      {/* Overall progress header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-slate-800">Overall Progress</h2>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {inProgress > 0 ? (
            <span className="flex items-center gap-1 text-blue-600 font-medium">
              <Loader2 className="w-3 h-3 animate-spin" /> Live — processing
            </span>
          ) : (
            <span>Auto-refreshes every 10s</span>
          )}
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-slate-900">{finished}</span>
        <span className="text-sm text-slate-400">of {total} imports finished</span>
        <span className="ml-auto text-sm font-mono text-slate-600">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2 mb-5" />

      {/* Three-state tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tiles.map(t => {
          const Icon = t.icon;
          return (
            <div key={t.label} className={`rounded-xl border ${t.border} p-4 flex items-start gap-3`}>
              <div className={`w-9 h-9 rounded-lg ${t.ring} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${t.color} ${t.spin ? "animate-spin" : ""}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t.label}</p>
                <p className={`text-2xl font-bold leading-tight ${t.color}`}>{t.value}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{t.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {total === 0 && (
        <p className="text-center text-sm text-slate-400 mt-4">
          No imports yet. URLs you submit from "Add to Library" will show up here.
        </p>
      )}
    </Card>
  );
}