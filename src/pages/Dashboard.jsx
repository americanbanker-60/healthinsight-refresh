import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, FileText, Settings, HelpCircle, Loader2 } from "lucide-react";
import KeyFeaturesModal from "../components/dashboard/KeyFeaturesModal";
import EmptyState from "../components/common/EmptyState";
import NewsletterCard from "../components/dashboard/NewsletterCard";
import StatsOverview from "../components/dashboard/StatsOverview";
import PersistentFilters from "../components/filters/PersistentFilters";
import TrendChart from "../components/dashboard/TrendChart";
import TrendDiscovery from "../components/trends/TrendDiscovery";
import SourceDistribution from "../components/dashboard/SourceDistribution";
import FeaturedTopicsSection from "../components/dashboard/FeaturedTopicsSection";
import { GridCardSkeleton } from "../components/common/CardSkeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardGuidance from "../components/dashboard/DashboardGuidance";
import GettingStartedGuide from "../components/dashboard/GettingStartedGuide";
import DailyIntelligenceBrief from "../components/dashboard/DailyIntelligenceBrief";
import DashboardSearch from "../components/dashboard/DashboardSearch";
import { useHealthcareIntelligence } from "../components/utils/useHealthcareIntelligence";

const defaultUserConfig = {
  visible_stats: ["newsletters", "ma_deals", "funding", "themes"],
  investment_focus: [],
  show_charts: true,
  newsletter_display: "full"
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = React.useState("all");
  const [showFeaturesModal, setShowFeaturesModal] = React.useState(false);

  const {
    newsletters: filteredNewsletters,
    allNewsletters: newsletters,
    sources,
    userConfig,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    persistentFilters,
    setPersistentFilters,
    availableThemes,
    availableCompanies,
    availableSources,
  } = useHealthcareIntelligence({
    activeTab,
    maxItems: 500,
    enableInvestmentFocus: true,
  });

  const displayVariant = userConfig?.newsletter_display || "full";

  const handleSourceSelect = (sourceName) => {
    setActiveTab(sourceName);
    setPersistentFilters(prev => ({
      ...prev,
      sources: [sourceName]
    }));
  };

  return (
    <div className="p-6 md:p-10 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
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

      <DashboardSearch />

      {!isLoading && newsletters.length > 0 && <DailyIntelligenceBrief />}

      {!isLoading && newsletters.length === 0 && <GettingStartedGuide />}

      <StatsOverview 
        newsletters={newsletters} 
        isLoading={isLoading}
        visibleStats={userConfig.visible_stats}
      />

      <TrendDiscovery />

      <FeaturedTopicsSection />

      {newsletters.length > 0 && (
        <SourceDistribution onSourceSelect={handleSourceSelect} />
      )}

      {userConfig.show_charts && newsletters.length > 0 && (
        <TrendChart newsletters={newsletters} />
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
            <>
              {filteredNewsletters.map((newsletter, index) => (
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
              ))}
              
              {hasMore && !isLoadingMore && (
                <div className="mt-6 text-center">
                  <Button
                    onClick={loadMore}
                    variant="outline"
                    className="px-8"
                  >
                    Load More
                  </Button>
                </div>
              )}
              
              {isLoadingMore && (
                <div className="mt-6 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                </div>
              )}
            </>
          )}
      </div>

      <KeyFeaturesModal open={showFeaturesModal} onOpenChange={setShowFeaturesModal} />
    </div>
  );
}