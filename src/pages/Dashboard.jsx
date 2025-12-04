import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, FileText, Settings, HelpCircle } from "lucide-react";
import KeyFeaturesModal from "../components/dashboard/KeyFeaturesModal";
import { motion } from "framer-motion";
import NewsletterCard from "../components/dashboard/NewsletterCard";
import NewsletterCardCompact from "../components/dashboard/NewsletterCardCompact";
import NewsletterCardMinimal from "../components/dashboard/NewsletterCardMinimal";
import StatsOverview from "../components/dashboard/StatsOverview";
import PersistentFilters, { applyFilters } from "../components/filters/PersistentFilters";
import TrendChart from "../components/dashboard/TrendChart";
import FeaturedPacks from "../components/dashboard/FeaturedPacks";
import TrendDiscovery from "../components/trends/TrendDiscovery";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const defaultUserConfig = {
  visible_stats: ["newsletters", "ma_deals", "funding", "themes"],
  investment_focus: [],
  show_charts: true,
  newsletter_display: "full"
};

export default function Dashboard() {
  const [persistentFilters, setPersistentFilters] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState("all");
  const [showFeaturesModal, setShowFeaturesModal] = React.useState(false);

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

  const { data: userConfig = defaultUserConfig } = useQuery({
    queryKey: ['dashboardUserConfig'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return user.dashboard_config || defaultUserConfig;
    },
    initialData: defaultUserConfig,
  });

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

  // Extract available themes and companies
  const availableThemes = React.useMemo(() => {
    const themes = new Set();
    newsletters.forEach(n => {
      if (n.themes) {
        n.themes.forEach(t => themes.add(t.theme));
      }
    });
    return Array.from(themes).sort();
  }, [newsletters]);

  const availableCompanies = React.useMemo(() => {
    const companies = new Set();
    newsletters.forEach(n => {
      if (n.key_players) {
        n.key_players.forEach(p => companies.add(p));
      }
    });
    return Array.from(companies).sort();
  }, [newsletters]);

  const availableSources = React.useMemo(() => {
    return sources.filter(s => !s.is_deleted).map(s => s.name).sort();
  }, [sources]);

  const filteredNewsletters = React.useMemo(() => {
    if (!persistentFilters) return focusFilteredNewsletters;
    return applyFilters(focusFilteredNewsletters, persistentFilters);
  }, [focusFilteredNewsletters, persistentFilters]);


  const NewsletterComponent = {
    full: NewsletterCard,
    compact: NewsletterCardCompact,
    minimal: NewsletterCardMinimal
  }[userConfig?.newsletter_display || "full"];

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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300"
            onClick={() => setShowFeaturesModal(true)}
          >
            <HelpCircle className="w-4 h-4 mr-2 text-blue-600" />
            What Can This App Do?
          </Button>
          <Link to={createPageUrl("DashboardSettings")}>
            <Button variant="outline" className="shadow-sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      <StatsOverview 
        newsletters={newsletters} 
        isLoading={isLoading}
        visibleStats={userConfig.visible_stats}
      />

      <TrendDiscovery />

      <FeaturedPacks />

      {userConfig.show_charts && newsletters.length > 0 && (
        <TrendChart newsletters={tabFilteredNewsletters} />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="all">All Sources ({newsletters.length})</TabsTrigger>
          {sources.filter(s => s && typeof s === 'object' && !s.is_deleted && s.name && s.id).map(source => {
            const count = newsletters.filter(n => n.source_name === source.name).length;
            return (
              <TabsTrigger key={source.id} value={source.name}>
                {source.name} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <PersistentFilters 
        onFilterChange={setPersistentFilters}
        availableThemes={availableThemes}
        availableCompanies={availableCompanies}
        showSourceFilter={true}
        availableSources={availableSources}
      />

      <div className={userConfig.newsletter_display === "minimal" ? "space-y-2" : "grid gap-6"}>
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
      </div>

      <KeyFeaturesModal open={showFeaturesModal} onOpenChange={setShowFeaturesModal} />
    </div>
  );
}