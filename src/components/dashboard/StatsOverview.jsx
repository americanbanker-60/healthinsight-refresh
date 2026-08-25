import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, TrendingUp, Briefcase, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function StatsOverview({ newsletters, isLoading, visibleStats = ["newsletters", "ma_deals", "funding", "themes"] }) {
  // Fetch aggregate stats server-side. The previous approach listed every full
  // NewsletterItem document in the browser just to count fields — that transfer
  // was far too large and failed, leaving all cards stuck at 0.
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getDashboardStats', {});
      const data = res?.data ?? res;
      return data?.stats || { articles: 0, analyzed: 0, ma_deals: 0, funding_rounds: 0, unique_themes: 0 };
    },
    staleTime: 60 * 1000,
  });

  const stats = [
    { label: "Newsletters Analyzed", value: statsData?.analyzed ?? 0, icon: FileText, color: "blue" },
    { label: "M&A Deals Tracked", value: statsData?.ma_deals ?? 0, icon: Briefcase, color: "green" },
    { label: "Funding Rounds", value: statsData?.funding_rounds ?? 0, icon: DollarSign, color: "emerald" },
    { label: "Unique Themes", value: statsData?.unique_themes ?? 0, icon: TrendingUp, color: "purple" },
  ];

  const colorClasses = {
    blue: "from-blue-500 to-blue-600 text-blue-600",
    green: "from-green-500 to-green-600 text-green-600",
    emerald: "from-emerald-500 to-emerald-600 text-emerald-600",
    purple: "from-purple-500 to-purple-600 text-purple-600",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const colorClass = colorClasses[stat.color];
        
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${colorClass} rounded-xl flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-600 mb-1">{stat.label}</p>
                {isLoading || isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}