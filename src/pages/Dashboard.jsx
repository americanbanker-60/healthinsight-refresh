import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, FileText, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NewsletterCard from "../components/dashboard/NewsletterCard";
import NewsletterCardCompact from "../components/dashboard/NewsletterCardCompact";
import NewsletterCardMinimal from "../components/dashboard/NewsletterCardMinimal";
import StatsOverview from "../components/dashboard/StatsOverview";
import AdvancedFilters from "../components/dashboard/AdvancedFilters";
import TrendChart from "../components/dashboard/TrendChart";
import FeaturedPacks from "../components/dashboard/FeaturedPacks";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    keywords: "",
    keyPlayer: "",
    dealValueMin: "",
    dealValueMax: "",
    fundingStage: "all",
    sentiment: "all"
  });
  const [userConfig, setUserConfig] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const { data: newsletters, isLoading } = useQuery({
    queryKey: ['newsletters'],
    queryFn: () => base44.entities.Newsletter.list("-created_date"),
    initialData: [],
  });

  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: () => base44.entities.Source.list("name"),
    initialData: [],
  });

  useEffect(() => {
    loadUserConfig();
  }, []);

  const loadUserConfig = async () => {
    try {
      const user = await base44.auth.me();
      const config = user.dashboard_config || {
        visible_stats: ["newsletters", "ma_deals", "funding", "themes"],
        investment_focus: [],
        show_charts: true,
        newsletter_display: "full",
        filters_expanded: false
      };
      setUserConfig(config);
      setShowFilters(config.filters_expanded);
    } catch (err) {
      setUserConfig({
        visible_stats: ["newsletters", "ma_deals", "funding", "themes"],
        investment_focus: [],
        show_charts: true,
        newsletter_display: "full",
        filters_expanded: false
      });
    }
  };

  // Filter by active tab
  const tabFilteredNewsletters = React.useMemo(() => {
    if (activeTab === "all") return newsletters;
    return newsletters.filter(n => n.source_name === activeTab);
  }, [newsletters, activeTab]);

  // Filter by investment focus
  const focusFilteredNewsletters = React.useMemo(() => {
    if (!userConfig?.investment_focus || userConfig.investment_focus.length === 0) {
      return tabFilteredNewsletters;
    }

    return tabFilteredNewsletters.map(newsletter => {
      let relevanceScore = 0;
      const matchedFocusAreas = [];

      userConfig.investment_focus.forEach(focus => {
        const focusLower = focus.toLowerCase();
        
        if (newsletter.title?.toLowerCase().includes(focusLower)) relevanceScore += 3;
        if (newsletter.summary?.toLowerCase().includes(focusLower)) relevanceScore += 2;
        if (newsletter.key_takeaways?.some(t => t.toLowerCase().includes(focusLower))) relevanceScore += 2;
        if (newsletter.themes?.some(t => 
          t.theme?.toLowerCase().includes(focusLower) || 
          t.description?.toLowerCase().includes(focusLower)
        )) {
          relevanceScore += 2;
          matchedFocusAreas.push(focus);
        }
      });

      return { ...newsletter, relevanceScore, matchedFocusAreas };
      }).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      }, [tabFilteredNewsletters, userConfig]);

  const filteredNewsletters = focusFilteredNewsletters.filter(newsletter => {
    // Keywords search - across title, summary, takeaways, themes
    if (filters.keywords) {
      const keyword = filters.keywords.toLowerCase();
      const matchesTitle = newsletter.title?.toLowerCase().includes(keyword);
      const matchesSummary = newsletter.summary?.toLowerCase().includes(keyword);
      const matchesTakeaways = newsletter.key_takeaways?.some(t => 
        t.toLowerCase().includes(keyword)
      );
      const matchesThemes = newsletter.themes?.some(theme => 
        theme.theme?.toLowerCase().includes(keyword) ||
        theme.description?.toLowerCase().includes(keyword)
      );
      const matchesMA = newsletter.ma_activities?.some(ma =>
        ma.acquirer?.toLowerCase().includes(keyword) ||
        ma.target?.toLowerCase().includes(keyword) ||
        ma.description?.toLowerCase().includes(keyword)
      );
      const matchesFunding = newsletter.funding_rounds?.some(f =>
        f.company?.toLowerCase().includes(keyword) ||
        f.description?.toLowerCase().includes(keyword)
      );
      
      if (!matchesTitle && !matchesSummary && !matchesTakeaways && !matchesThemes && !matchesMA && !matchesFunding) {
        return false;
      }
    }

    // Sentiment filter
    if (filters.sentiment !== "all" && newsletter.sentiment !== filters.sentiment) {
      return false;
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      let pubDate;
      if (newsletter.publication_date) {
        pubDate = new Date(newsletter.publication_date);
        if (isNaN(pubDate.getTime())) pubDate = null;
      }
      
      if (!pubDate && newsletter.created_date) {
        pubDate = new Date(newsletter.created_date);
        if (isNaN(pubDate.getTime())) pubDate = null;
      }
      
      if (!pubDate) return false;
      
      if (filters.startDate && pubDate < filters.startDate) return false;
      if (filters.endDate && pubDate > filters.endDate) return false;
    }

    // Key player filter
    if (filters.keyPlayer && newsletter.key_players) {
      const hasPlayer = newsletter.key_players.includes(filters.keyPlayer);
      const inMA = newsletter.ma_activities?.some(ma =>
        ma.acquirer === filters.keyPlayer || ma.target === filters.keyPlayer
      );
      const inFunding = newsletter.funding_rounds?.some(f =>
        f.company === filters.keyPlayer
      );
      
      if (!hasPlayer && !inMA && !inFunding) return false;
    }

    // Funding stage filter
    if (filters.fundingStage !== "all" && newsletter.funding_rounds) {
      const hasFundingStage = newsletter.funding_rounds.some(f => 
        f.round_type === filters.fundingStage
      );
      if (!hasFundingStage) return false;
    }

    // Deal value filter (extract numeric value from strings like "$100M", "$1.5B")
    if ((filters.dealValueMin || filters.dealValueMax) && newsletter.ma_activities) {
      const extractValue = (dealValue) => {
        if (!dealValue) return null;
        const match = dealValue.match(/\$?([\d.]+)\s*(M|B|Million|Billion)/i);
        if (!match) return null;
        
        let value = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        
        if (unit.startsWith('B')) value *= 1000; // Convert billions to millions
        return value;
      };

      const hasMatchingDeal = newsletter.ma_activities.some(ma => {
        const dealValue = extractValue(ma.deal_value);
        if (dealValue === null) return false;
        
        const min = filters.dealValueMin ? parseFloat(filters.dealValueMin) : 0;
        const max = filters.dealValueMax ? parseFloat(filters.dealValueMax) : Infinity;
        
        return dealValue >= min && dealValue <= max;
      });

      if (!hasMatchingDeal) return false;
    }

    return true;
  });

  const NewsletterComponent = {
    full: NewsletterCard,
    compact: NewsletterCardCompact,
    minimal: NewsletterCardMinimal
  }[userConfig?.newsletter_display || "full"];

  if (!userConfig) {
    return (
      <div className="p-10 max-w-7xl mx-auto">
        <Skeleton className="h-12 w-1/3 mb-8" />
        <div className="grid gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Healthcare Intelligence</h1>
          <p className="text-slate-600 text-lg">Track market movements, M&A activity, and emerging trends</p>
          {userConfig.investment_focus && userConfig.investment_focus.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {userConfig.investment_focus.map(focus => (
                <Badge key={focus} variant="outline" className="text-xs">
                  {focus}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Link to={createPageUrl("DashboardSettings")}>
          <Button variant="outline" className="shadow-sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </Link>
      </div>

      <StatsOverview 
        newsletters={newsletters} 
        isLoading={isLoading}
        visibleStats={userConfig.visible_stats}
      />

      <FeaturedPacks />

      {userConfig.show_charts && newsletters.length > 0 && (
        <TrendChart newsletters={tabFilteredNewsletters} />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="all">All Sources ({newsletters.length})</TabsTrigger>
          {sources.filter(s => !s.is_deleted).map(source => {
            const count = newsletters.filter(n => n.source_name === source.name).length;
            return (
              <TabsTrigger key={source.id} value={source.name}>
                {source.name} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <AdvancedFilters 
        newsletters={tabFilteredNewsletters} 
        onFiltersChange={setFilters}
        defaultExpanded={showFilters}
      />

      <div className={userConfig.newsletter_display === "minimal" ? "space-y-2" : "grid gap-6"}>
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
              <div key={newsletter.id}>
                <NewsletterComponent newsletter={newsletter} index={index} />
                {newsletter.matchedFocusAreas && newsletter.matchedFocusAreas.length > 0 && (
                  <div className="flex gap-1 mt-2 ml-2">
                    {newsletter.matchedFocusAreas.map(focus => (
                      <Badge key={focus} className="bg-purple-100 text-purple-700 border-purple-200 text-xs">
                        {focus}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}