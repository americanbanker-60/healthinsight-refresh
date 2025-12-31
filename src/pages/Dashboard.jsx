import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, FileText, Settings, HelpCircle } from "lucide-react";
import KeyFeaturesModal from "../components/dashboard/KeyFeaturesModal";
import EmptyState from "../components/common/EmptyState";
import NewsletterCard from "../components/dashboard/NewsletterCard";
import StatsOverview from "../components/dashboard/StatsOverview";
import PersistentFilters, { applyFilters } from "../components/filters/PersistentFilters";
import TrendChart from "../components/dashboard/TrendChart";
import TrendDiscovery from "../components/trends/TrendDiscovery";
import { GridCardSkeleton } from "../components/common/CardSkeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardGuidance from "../components/dashboard/DashboardGuidance";

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
    
    // Check if any filters are actually active
    const hasActiveFilters = 
      persistentFilters.keywords?.trim() ||
      persistentFilters.startDate ||
      persistentFilters.endDate ||
      (persistentFilters.sentiments && persistentFilters.sentiments.length > 0) ||
      (persistentFilters.themes && persistentFilters.themes.length > 0) ||
      (persistentFilters.companies && persistentFilters.companies.length > 0) ||
      (persistentFilters.sources && persistentFilters.sources.length > 0);
    
    // If no filters are active, show all newsletters
    if (!hasActiveFilters) return focusFilteredNewsletters;
    
    return applyFilters(focusFilteredNewsletters, persistentFilters);
  }, [focusFilteredNewsletters, persistentFilters]);


  const displayVariant = userConfig?.newsletter_display || "full";

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full overflow-x-hidden">
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

      <DashboardGuidance />

      <StatsOverview 
        newsletters={newsletters} 
        isLoading={isLoading}
        visibleStats={userConfig.visible_stats}
      />

      <TrendDiscovery />

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

      <div className={displayVariant === "minimal" ? "space-y-2" : "grid gap-6"}>
        {isLoading ? (
          <GridCardSkeleton count={3} />
        ) : filteredNewsletters.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No newsletters found"
              description="Start analyzing healthcare newsletters to build your intelligence library"
              actionLabel="Analyze First Newsletter"
              actionIcon={Plus}
              onAction={() => window.location.href = createPageUrl("AnalyzeNewsletter")}
            />
          ) : (
            filteredNewsletters.map((newsletter, index) => (
              <div key={newsletter.id}>
                <NewsletterCard newsletter={newsletter} index={index} variant={displayVariant} />
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