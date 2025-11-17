import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, TrendingUp, Briefcase, FileText, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NewsletterCard from "../components/dashboard/NewsletterCard";
import StatsOverview from "../components/dashboard/StatsOverview";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("all");

  const { data: newsletters, isLoading } = useQuery({
    queryKey: ['newsletters'],
    queryFn: () => base44.entities.Newsletter.list("-created_date"),
    initialData: [],
  });

  const filteredNewsletters = newsletters.filter(newsletter => {
    const matchesSearch = newsletter.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         newsletter.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSentiment = sentimentFilter === "all" || newsletter.sentiment === sentimentFilter;
    return matchesSearch && matchesSentiment;
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Healthcare Intelligence</h1>
          <p className="text-slate-600 text-lg">Track market movements, M&A activity, and emerging trends</p>
        </div>
        <Link to={createPageUrl("AnalyzeNewsletter")}>
          <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40">
            <Plus className="w-5 h-5 mr-2" />
            Analyze Newsletter
          </Button>
        </Link>
      </div>

      <StatsOverview newsletters={newsletters} isLoading={isLoading} />

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/60 p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search newsletters, companies, or themes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 border-slate-200 focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {["all", "positive", "neutral", "negative", "mixed"].map((sentiment) => (
              <Button
                key={sentiment}
                variant={sentimentFilter === sentiment ? "default" : "outline"}
                onClick={() => setSentimentFilter(sentiment)}
                className={`capitalize ${
                  sentimentFilter === sentiment 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "hover:bg-slate-50"
                }`}
              >
                {sentiment}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <AnimatePresence mode="wait">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/60">
                <Skeleton className="h-8 w-2/3 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ))
          ) : filteredNewsletters.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No newsletters found</h3>
              <p className="text-slate-500 mb-6">Start analyzing healthcare newsletters to build your intelligence library</p>
              <Link to={createPageUrl("AnalyzeNewsletter")}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Analyze First Newsletter
                </Button>
              </Link>
            </motion.div>
          ) : (
            filteredNewsletters.map((newsletter, index) => (
              <NewsletterCard key={newsletter.id} newsletter={newsletter} index={index} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}