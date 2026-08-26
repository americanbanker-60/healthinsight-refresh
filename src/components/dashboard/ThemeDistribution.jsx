import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from "recharts";
import { Layers, MousePointerClick } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

const TOP_N = 12;
const BAR_COLOR = "#6366f1";
const BAR_COLOR_HOVER = "#4f46e5";

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div className="bg-white/95 border border-slate-200 rounded-lg px-3 py-2 shadow-md">
      <p className="text-sm font-medium text-slate-900">{name}</p>
      <p className="text-xs text-slate-600">{value} mentions</p>
      <p className="text-[11px] text-indigo-600 mt-1 flex items-center gap-1">
        <MousePointerClick className="w-3 h-3" /> Click to view articles
      </p>
    </div>
  );
}

export default function ThemeDistribution() {
  const navigate = useNavigate();

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

  const handleBarClick = (entry) => {
    if (!entry?.name) return;
    navigate(`${createPageUrl("TopicPage")}?topic=${encodeURIComponent(entry.name)}`);
  };

  const chartHeight = Math.max(440, top.length * 42 + 60);

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 mb-6">
      <CardHeader className="border-b border-slate-200/60 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers className="w-5 h-5 text-indigo-600" />
          Theme Distribution
          <span className="text-xs font-normal text-slate-400 flex items-center gap-1 ml-2">
            <MousePointerClick className="w-3.5 h-3.5" />
            Click a theme to view articles
          </span>
        </CardTitle>
        <CardDescription>
          Normalized topic coverage across all analyzed newsletters
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <Skeleton className="h-[440px] w-full rounded-lg" />
        ) : top.length === 0 ? (
          <div className="h-[440px] flex items-center justify-center text-slate-400 text-sm">
            No theme data yet.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={top}
                layout="vertical"
                margin={{ left: 8, right: 64, top: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#64748b" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={180}
                  tick={{ fontSize: 13, fill: "#334155" }}
                  stroke="#64748b"
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
                <Bar
                  dataKey="value"
                  fill={BAR_COLOR}
                  radius={[0, 6, 6, 0]}
                  barSize={26}
                  cursor="pointer"
                  onClick={handleBarClick}
                >
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(v) => v.toLocaleString()}
                    style={{ fontSize: 13, fontWeight: 600, fill: "#334155" }}
                  />
                  {top.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={BAR_COLOR} className="hover:opacity-80 transition-opacity" />
                  ))}
                </Bar>
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