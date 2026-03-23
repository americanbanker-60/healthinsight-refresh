import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, AlertCircle, Copy, ChevronDown, ChevronUp, ClipboardList } from "lucide-react";
import { format } from "date-fns";

const STATUS_STYLES = {
  success: "bg-green-100 text-green-800 border-green-200",
  duplicate: "bg-amber-100 text-amber-800 border-amber-200",
  failed: "bg-red-100 text-red-800 border-red-200",
};

export default function UploadAuditLog() {
  const [expanded, setExpanded] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["uploadAuditLog"],
    queryFn: () => base44.entities.UploadAuditLog.list("-created_date", 200),
    refetchInterval: expanded ? 10000 : false,
  });

  // Group by bulk_session_id or treat singles individually
  const sessions = React.useMemo(() => {
    const groups = {};
    logs.forEach(log => {
      const key = log.bulk_session_id || `single_${log.id}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          isBulk: !!log.bulk_session_id,
          createdAt: log.created_date,
          uploadedBy: log.uploaded_by,
          rows: [],
        };
      }
      groups[key].rows.push(log);
    });
    return Object.values(groups).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [logs]);

  const totalSuccess = logs.filter(l => l.status === "success").length;
  const totalFailed = logs.filter(l => l.status === "failed").length;
  const totalDuplicate = logs.filter(l => l.status === "duplicate").length;

  return (
    <Card className="border-slate-200">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-slate-600" />
            <CardTitle className="text-base">Upload Audit Log</CardTitle>
            {!isLoading && logs.length > 0 && (
              <div className="flex gap-2 ml-2">
                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">{totalSuccess} saved</Badge>
                {totalDuplicate > 0 && <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">{totalDuplicate} dupes</Badge>}
                {totalFailed > 0 && <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">{totalFailed} failed</Badge>}
              </div>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
        <CardDescription>Full history of every newsletter upload — click to expand</CardDescription>
      </CardHeader>

      {expanded && (
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No upload history yet. Uploads from this point forward will be tracked here.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {sessions.map(session => (
                <SessionRow key={session.key} session={session} />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function SessionRow({ session }) {
  const [open, setOpen] = useState(false);
  const success = session.rows.filter(r => r.status === "success").length;
  const failed = session.rows.filter(r => r.status === "failed").length;
  const dupes = session.rows.filter(r => r.status === "duplicate").length;
  const label = session.isBulk ? `Bulk upload — ${session.rows.length} URLs` : (session.rows[0]?.title || session.rows[0]?.url || "Single upload");

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 text-sm truncate">{label}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {session.uploadedBy} · {format(new Date(session.createdAt), "MMM d, yyyy h:mm a")}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {success > 0 && <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">{success} saved</Badge>}
          {dupes > 0 && <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">{dupes} dupes</Badge>}
          {failed > 0 && <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">{failed} failed</Badge>}
          {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </div>
      </div>

      {open && (
        <div className="divide-y divide-slate-100">
          {session.rows.map(row => (
            <div key={row.id} className="flex items-start gap-3 p-3 text-xs">
              <div className="mt-0.5 flex-shrink-0">
                {row.status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
                {row.status === "duplicate" && <Copy className="w-3.5 h-3.5 text-amber-500" />}
                {row.status === "failed" && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{row.title || row.url || "—"}</p>
                {row.url && row.title && <p className="text-slate-400 truncate font-mono">{row.url}</p>}
                {row.error_message && <p className="text-red-600 mt-0.5">{row.error_message}</p>}
              </div>
              <Badge className={`text-xs flex-shrink-0 ${STATUS_STYLES[row.status]}`}>{row.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}