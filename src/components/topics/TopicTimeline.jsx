import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp } from "lucide-react";
import { format, startOfWeek, startOfMonth, eachWeekOfInterval, eachMonthOfInterval, subDays } from "date-fns";

export default function TopicTimeline({ newsletters, timeRange, onTimeRangeChange }) {
  const timelineData = useMemo(() => {
    if (!newsletters.length) return [];
    
    const endDate = new Date();
    const startDate = subDays(endDate, timeRange);
    
    // Group by week or month depending on time range
    const groupByWeek = timeRange <= 90;
    
    if (groupByWeek) {
      const weeks = eachWeekOfInterval({ start: startDate, end: endDate });
      return weeks.map(weekStart => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const items = newsletters.filter(n => {
          const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
          return pubDate >= weekStart && pubDate <= weekEnd;
        });
        
        return {
          label: format(weekStart, "MMM d"),
          count: items.length,
          items
        };
      });
    } else {
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      return months.map(monthStart => {
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(monthEnd.getDate() - 1);
        
        const items = newsletters.filter(n => {
          const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
          return pubDate >= monthStart && pubDate <= monthEnd;
        });
        
        return {
          label: format(monthStart, "MMM yyyy"),
          count: items.length,
          items
        };
      });
    }
  }, [newsletters, timeRange]);

  const maxCount = Math.max(...timelineData.map(d => d.count), 1);

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
        {timelineData.length === 0 ? (
          <p className="text-center py-8 text-slate-500">No data available for selected time range</p>
        ) : (
          <div className="space-y-3">
            {timelineData.map((data, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-20 text-xs text-slate-600 text-right">{data.label}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-full h-6 flex items-center justify-center transition-all"
                      style={{
                        width: `${Math.max((data.count / maxCount) * 100, 5)}%`,
                        minWidth: data.count > 0 ? '40px' : '0px'
                      }}
                    >
                      {data.count > 0 && (
                        <span className="text-white text-xs font-semibold px-2">{data.count}</span>
                      )}
                    </div>
                    {data.count === 0 && (
                      <span className="text-xs text-slate-400">No mentions</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {newsletters.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <TrendingUp className="w-4 h-4" />
              <span>Total mentions in last {timeRange} days:</span>
              <Badge>{newsletters.length}</Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}