import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

export default function BriefPreview({ brief }) {
  if (!brief) {
    return (
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle>Brief Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No brief selected</p>
            <p className="text-sm text-slate-500 mt-2">Generate a brief to see it here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader>
        <CardTitle>Brief Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4 mb-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-indigo-900">{brief.counterparty_name}</p>
              <p className="text-xs text-indigo-600 mt-1">
                Generated {format(new Date(brief.created_date), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
          <ReactMarkdown>{brief.brief_markdown || "Brief not available"}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
