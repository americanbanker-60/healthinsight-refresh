import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Trash2, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatSummaryAsMarkdown } from "../utils/markdownFormatter";

export default function SavedSummariesSection() {
  const queryClient = useQueryClient();
  const [selectedSummary, setSelectedSummary] = useState(null);

  const { data: summaries = [] } = useQuery({
    queryKey: ['savedSummaries'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.SavedSummary.filter(
        { created_by: user.email },
        "-created_date"
      );
    },
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedSummary.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSummaries'] });
      toast.success("Summary deleted");
    },
  });

  const downloadSummary = async (summary) => {
    try {
      const formattedMarkdown = await formatSummaryAsMarkdown(summary.summary_body);
      
      const blob = new Blob([formattedMarkdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${summary.summary_title.replace(/[^a-z0-9]/gi, '_')}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Formatted markdown downloaded");
    } catch (error) {
      toast.error("Failed to download");
      console.error(error);
    }
  };

  if (summaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            Saved Summaries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-600">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">Generate a summary on the Explore page, then save it to access it here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Saved Summaries
            </CardTitle>
            <span className="text-sm text-slate-500">{summaries.length} saved</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summaries.map(summary => (
              <Card key={summary.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1">{summary.summary_title}</h4>
                      <p className="text-xs text-slate-500 mb-2">
                        {format(new Date(summary.created_date), "MMM d, yyyy")}
                      </p>
                      {summary.sources_included?.length > 0 && (
                        <p className="text-xs text-slate-600">
                          {summary.sources_included.length} sources included
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSummary(summary)}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadSummary(summary)}
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(summary.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedSummary && (
        <Dialog open={!!selectedSummary} onOpenChange={() => setSelectedSummary(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedSummary.summary_title}</DialogTitle>
            </DialogHeader>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm font-sans">
                {selectedSummary.summary_body}
              </pre>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}