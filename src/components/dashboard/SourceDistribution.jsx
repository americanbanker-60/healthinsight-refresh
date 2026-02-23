import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { base44 } from "@/api/base44Client";
import { retrieveSourceStats } from "@/components/utils/dataRetrieval";

export default function SourceDistribution({ onSourceSelect }) {
  const { data: sourceStats = [], isLoading } = useQuery({
    queryKey: ["sourceStats"],
    queryFn: retrieveSourceStats,
    initialData: [],
  });

  if (isLoading) {
    return (
      <Card className="bg-white border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Intelligence Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-slate-500">
            Loading source data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sourceStats.length === 0) {
    return (
      <Card className="bg-white border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Intelligence Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            No newsletters loaded yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalNewsletters = sourceStats.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="bg-white border border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg">Intelligence Inventory</CardTitle>
        <p className="text-sm text-slate-600 mt-2">
          {totalNewsletters} newsletters across {sourceStats.length} sources
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sourceStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="source" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip formatter={(value) => `${value} items`} />
              <Bar 
                dataKey="count" 
                fill="#3b82f6" 
                radius={[8, 8, 0, 0]}
                onClick={(e) => onSourceSelect && onSourceSelect(e.payload.source)}
                cursor="pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Source Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sourceStats.map((item) => (
            <div
              key={item.source}
              onClick={() => onSourceSelect && onSourceSelect(item.source)}
              className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900 truncate flex-1">
                  {item.source}
                </span>
                <Badge className="bg-blue-600 text-white ml-2">
                  {item.count}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}