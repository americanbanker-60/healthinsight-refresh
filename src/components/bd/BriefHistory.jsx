import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function BriefHistory({ briefs, viewingId, onSelect }) {
  return (
    <Card className="bg-white shadow-lg">
      <CardHeader>
        <CardTitle>History ({briefs.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {briefs.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No briefs yet</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {briefs.map(b => {
              if (!b || !b.id) return null;
              return (
                <div
                  key={b.id}
                  className={`p-3 border rounded-lg cursor-pointer transition ${
                    viewingId === b.id
                      ? 'bg-indigo-50 border-indigo-300'
                      : 'hover:bg-slate-50 border-slate-200'
                  }`}
                  onClick={() => onSelect(b.id)}
                >
                  <p className="font-semibold text-sm">{b.counterparty_name || "Unnamed"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {b.counterparty_type || "N/A"}
                    </Badge>
                    {b.created_date && (
                      <span className="text-xs text-slate-500">
                        {format(new Date(b.created_date), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
