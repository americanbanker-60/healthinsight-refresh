import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Building2, Trash2, Sparkles, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import BDContentGeneratorModal from "@/components/bd/BDContentGeneratorModal";
import { createPageUrl } from "@/utils";

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  contacted: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_OPTIONS = ["new", "in_progress", "contacted", "closed"];

function OpportunityCard({ opp, onDelete, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(opp.notes || "");
  const [showGenerator, setShowGenerator] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const saveNotes = async () => {
    setSavingNotes(true);
    await onUpdate(opp.id, { notes });
    setSavingNotes(false);
  };

  const updateStatus = (status) => onUpdate(opp.id, { status });

  return (
    <>
      <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge className={`border text-xs ${STATUS_COLORS[opp.status || "new"]}`}>
                  {(opp.status || "new").replace("_", " ")}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">{opp.source_type}</Badge>
              </div>
              <h3 className="font-semibold text-slate-900 leading-snug">{opp.title}</h3>
              {opp.context_summary && (
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{opp.context_summary}</p>
              )}
              {opp.companies?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {opp.companies.slice(0, 4).map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      <Building2 className="w-3 h-3" />{c}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-2">
                {opp.created_date ? formatDistanceToNow(new Date(opp.created_date), { addSuffix: true }) : ""}
              </p>
            </div>
            <div className="flex gap-1 shrink-0 items-start">
              {opp.newsletter_id && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 whitespace-nowrap"
                  onClick={() => window.open(`${createPageUrl("NewsletterDetail")}?id=${opp.newsletter_id}`, "_blank")}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  See HealthInsight Summary
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setExpanded(e => !e)} className="text-slate-400 hover:text-slate-600">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(opp.id)} className="text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {expanded && (
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              {/* Status update */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Update status</p>
                <div className="flex gap-1 flex-wrap">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(s)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        opp.status === s
                          ? STATUS_COLORS[s]
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add notes about this opportunity..."
                  rows={2}
                  className="text-sm"
                />
                <Button size="sm" variant="outline" onClick={saveNotes} disabled={savingNotes} className="mt-1 text-xs h-7">
                  {savingNotes ? "Saving..." : "Save notes"}
                </Button>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs"
                  onClick={() => setShowGenerator(true)}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Generate Outreach
                </Button>
                {opp.newsletter_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100"
                    onClick={() => window.open(`${createPageUrl("NewsletterDetail")}?id=${opp.newsletter_id}`, "_blank")}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    See HealthInsight Summary
                  </Button>
                )}
              </div>

              {/* Last generated content preview */}
              {opp.generated_content && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-1">Last generated content</p>
                  <p className="text-xs text-slate-600 line-clamp-3">{opp.generated_content}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <BDContentGeneratorModal
        open={showGenerator}
        onClose={() => setShowGenerator(false)}
        contextType={opp.source_type}
        contextData={{
          title: opp.title,
          summary: opp.context_summary,
          companies: opp.companies,
          deals: opp.deals,
          themes: opp.themes,
          actionLabel: "reach out now",
        }}
      />
    </>
  );
}

export default function BDOpportunities() {
  const queryClient = useQueryClient();

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["bd_opportunities"],
    queryFn: () => base44.entities.BDOpportunity.list("-created_date"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BDOpportunity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bd_opportunities"] });
      toast.success("Opportunity removed");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BDOpportunity.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bd_opportunities"] }),
  });

  const statusGroups = {
    new: opportunities.filter(o => (o.status || "new") === "new"),
    in_progress: opportunities.filter(o => o.status === "in_progress"),
    contacted: opportunities.filter(o => o.status === "contacted"),
    closed: opportunities.filter(o => o.status === "closed"),
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">BD Opportunities</h1>
          <p className="text-sm text-slate-500">Deal signals and articles saved for outreach</p>
        </div>
        <div className="ml-auto">
          <Badge variant="outline" className="text-slate-600">{opportunities.length} saved</Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-slate-400">Loading...</div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-20">
          <Zap className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No BD opportunities saved yet</p>
          <p className="text-sm text-slate-400 mt-1">When you see a deal signal or interesting article, click "Save as BD Opportunity" to track it here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(statusGroups).map(([status, items]) =>
            items.length > 0 ? (
              <div key={status}>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  {status.replace("_", " ")} ({items.length})
                </h2>
                <div className="space-y-3">
                  {items.map(opp => (
                    <OpportunityCard
                      key={opp.id}
                      opp={opp}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onUpdate={(id, data) => updateMutation.mutate({ id, data })}
                    />
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}