import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock, RefreshCw, SkipForward } from "lucide-react";

export const STATUS = {
  pending:    { icon: Clock,        color: "text-slate-400",  bg: "bg-slate-50 border-slate-200",  label: "Waiting..." },
  processing: { icon: RefreshCw,    color: "text-blue-500",   bg: "bg-blue-50 border-blue-200",    label: "Analyzing with AI..." },
  success:    { icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50 border-green-200",  label: "Added to shared library" },
  duplicate:  { icon: SkipForward,  color: "text-amber-500",  bg: "bg-amber-50 border-amber-200",  label: "Already in library — skipped" },
  error:      { icon: AlertCircle,  color: "text-red-600",    bg: "bg-red-50 border-red-200",      label: "Failed" },
};

export default function UrlRow({ item }) {
  const cfg = STATUS[item.status];
  const Icon = cfg.icon;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border text-sm transition-all ${cfg.bg}`}>
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color} ${item.status === "processing" ? "animate-spin" : ""}`} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 truncate text-xs font-mono">{item.url}</p>
        {item.title && item.status !== "pending" && <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">{item.title}</p>}
        <p className={`text-xs mt-0.5 ${cfg.color}`}>{item.status === "error" ? item.errorMsg : cfg.label}</p>
      </div>
      <Badge variant="outline" className={`text-xs shrink-0 ${cfg.color} border-current`}>{item.status}</Badge>
    </div>
  );
}
