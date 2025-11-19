import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Eye } from "lucide-react";
import { format } from "date-fns";

export default function CompanyTimeline({ newsletters, timeRange, onTimeRangeChange, onViewDetail }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-600" />
            Timeline of Mentions
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={timeRange === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => onTimeRangeChange(30)}
            >
              30d
            </Button>
            <Button
              variant={timeRange === 90 ? "default" : "outline"}
              size="sm"
              onClick={() => onTimeRangeChange(90)}
            >
              90d
            </Button>
            <Button
              variant={timeRange === 180 ? "default" : "outline"}
              size="sm"
              onClick={() => onTimeRangeChange(180)}
            >
              180d
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {newsletters.length === 0 ? (
          <p className="text-center py-8 text-slate-500">No mentions found in selected time range</p>
        ) : (
          <div className="space-y-3">
            {newsletters.slice(0, 20).map(newsletter => {
              const pubDate = newsletter.publication_date 
                ? new Date(newsletter.publication_date) 
                : new Date(newsletter.created_date);
              
              return (
                <Card key={newsletter.id} className="border-slate-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                          <Badge variant="outline" className="text-xs">{newsletter.source_name}</Badge>
                          <span>{format(pubDate, "MMM d, yyyy")}</span>
                        </div>
                        <h4 className="font-semibold text-sm mb-1">{newsletter.title}</h4>
                        {newsletter.tldr && (
                          <p className="text-xs text-slate-600 line-clamp-2">{newsletter.tldr}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetail(newsletter.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {newsletters.length > 20 && (
              <p className="text-center text-sm text-slate-500 pt-2">
                Showing 20 of {newsletters.length} mentions
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}