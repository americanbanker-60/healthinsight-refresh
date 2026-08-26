import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const TOP_N = 12;

const BAR_COLOR = "#6366f1";

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div className="bg-white/95 border border-slate-200 rounded-lg px-3 py-2 shadow-md">
      <p className="text-sm font-medium text-slate-900">{name}</p>
      <p className="text-xs text-slate-600">{value} mentions</p>
    </div>
  );
}

export default function ThemeDistribution() {
  const { data, isLoading } = useQuery({
    queryKey: ['themeDistribution'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getDashboardStats', {});
      const data = res?.data ?? res;
      return data?.stats?.theme_distribution || [];
    },
    staleTime: 60 * 1000,
  });

  const top = (data || []).slice(0, TOP_N);
  const totalMentions = (data || []).reduce((s, t) => s + (t.value || 0), 0);

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 mb-6">
      <CardHeader className="border-b border-slate-200/60 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers className="w-5 h-5 text-indigo-600" />
          Theme Distribution
        </CardTitle>
        <CardDescription>
          Normalized topic coverage across all analyzed newsletters
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <Skeleton className="h-[360px] w-full rounded-lg" />
        ) : top.length === 0 ? (
          <div className="h-[360px] flex items-center justify-center text-slate-400 text-sm">
            No theme data yet.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(320, top.length * 28 + 40)}>
              <BarChart data={top} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#64748b" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  tick={{ fontSize: 12, fill: "#334155" }}
                  stroke="#64748b"
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
                <Bar dataKey="value" fill={BAR_COLOR} radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-500 mt-3">
              Showing top {top.length} of {(data || []).length} themes · {totalMentions.toLocaleString()} total mentions
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}