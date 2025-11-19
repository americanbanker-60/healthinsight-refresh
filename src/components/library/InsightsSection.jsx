import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BarChart3, Tag, BookOpen, Newspaper, Activity, Sparkles, Star } from "lucide-react";
import { subDays } from "date-fns";
import { logPackView } from "../utils/packTracking";

export default function InsightsSection() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("30");
  const [aiSummary, setAiSummary] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);

  const rangeDate = useMemo(() => subDays(new Date(), parseInt(timeRange)), [timeRange]);

  const { data: searchActivity = [] } = useQuery({
    queryKey: ['userSearchActivity', timeRange],
    queryFn: async () => {
      const user = await base44.auth.me();
      const activities = await base44.entities.UserSearchActivity.filter(
        { created_by: user.email },
        "-executed_at"
      );
      return activities.filter(a => new Date(a.executed_at || a.created_date) >= rangeDate);
    },
    initialData: [],
  });

  const { data: recentViews = [] } = useQuery({
    queryKey: ['recentlyViewedPacks', timeRange],
    queryFn: async () => {
      const user = await base44.auth.me();
      const views = await base44.entities.RecentlyViewedPack.filter(
        { created_by: user.email },
        "-viewed_at"
      );
      return views.filter(v => new Date(v.viewed_at) >= rangeDate);
    },
    initialData: [],
  });

  const { data: savedSearches = [] } = useQuery({
    queryKey: ['savedSearches', timeRange],
    queryFn: async () => {
      const user = await base44.auth.me();
      const searches = await base44.entities.SavedSearch.filter(
        { created_by: user.email },
        "-created_date"
      );
      return searches.filter(s => new Date(s.created_date) >= rangeDate);
    },
    initialData: [],
  });

  const { data: savedSummaries = [] } = useQuery({
    queryKey: ['savedSummaries', timeRange],
    queryFn: async () => {
      const user = await base44.auth.me();
      const summaries = await base44.entities.SavedSummary.filter(
        { created_by: user.email },
        "-created_date"
      );
      return summaries.filter(s => new Date(s.created_date) >= rangeDate);
    },
    initialData: [],
  });

  const { data: favoritePacks = [] } = useQuery({
    queryKey: ['favoritePacks', timeRange],
    queryFn: async () => {
      const user = await base44.auth.me();
      const favorites = await base44.entities.FavoritePack.filter(
        { created_by: user.email },
        "-favorited_at"
      );
      return favorites.filter(f => new Date(f.favorited_at || f.created_date) >= rangeDate);
    },
    initialData: [],
  });

  const { data: allPacks = [] } = useQuery({
    queryKey: ['learningPacks'],
    queryFn: () => base44.entities.LearningPack.list("sort_order"),
    initialData: [],
  });

  // Compute insights
  const topTopics = useMemo(() => {
    const topicCounts = {};
    
    searchActivity.forEach(activity => {
      if (activity.keywords) {
        const keywords = activity.keywords.toLowerCase().split(/\s+/);
        keywords.forEach(kw => {
          if (kw.length > 3) {
            topicCounts[kw] = (topicCounts[kw] || 0) + 1;
          }
        });
      }
      if (activity.topics_selected) {
        activity.topics_selected.forEach(topic => {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });
      }
    });

    savedSearches.forEach(search => {
      if (search.keywords) {
        const keywords = search.keywords.toLowerCase().split(/\s+/);
        keywords.forEach(kw => {
          if (kw.length > 3) {
            topicCounts[kw] = (topicCounts[kw] || 0) + 1;
          }
        });
      }
      if (search.topics_selected) {
        search.topics_selected.forEach(topic => {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });
      }
    });

    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));
  }, [searchActivity, savedSearches]);

  const topPacks = useMemo(() => {
    const packCounts = {};
    recentViews.forEach(view => {
      packCounts[view.pack_id] = (packCounts[view.pack_id] || 0) + 1;
    });

    return Object.entries(packCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([packId, count]) => {
        const pack = allPacks.find(p => p.id === packId);
        const isFavorite = favoritePacks.some(f => f.pack_id === packId);
        return { pack, count, isFavorite };
      })
      .filter(item => item.pack);
  }, [recentViews, allPacks, favoritePacks]);

  const topSources = useMemo(() => {
    const sourceCounts = {};
    
    searchActivity.forEach(activity => {
      if (activity.sources_selected) {
        activity.sources_selected.forEach(source => {
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        });
      }
    });

    savedSearches.forEach(search => {
      if (search.sources_selected) {
        search.sources_selected.forEach(source => {
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        });
      }
    });

    return Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, count]) => ({ source, count }));
  }, [searchActivity, savedSearches]);

  const activityStats = {
    searches: searchActivity.length,
    summaries: savedSummaries.length,
    packsOpened: recentViews.length,
    newFavorites: favoritePacks.length,
  };

  const hasActivity = topTopics.length > 0 || topPacks.length > 0 || topSources.length > 0 || activityStats.searches > 0;

  const generateAISummary = async () => {
    if (generatingAI || !hasActivity) return;
    
    setGeneratingAI(true);
    try {
      const prompt = `Generate a 2-4 sentence summary of a user's recent learning activity. Be descriptive and neutral.

User activity in the last ${timeRange} days:
- Top topics/keywords: ${topTopics.map(t => t.topic).join(', ')}
- Most opened packs: ${topPacks.map(p => p.pack.pack_title).join(', ')}
- Primary sources: ${topSources.map(s => s.source).join(', ')}
- ${activityStats.searches} searches run
- ${activityStats.summaries} summaries generated
- ${activityStats.packsOpened} pack views
- ${activityStats.newFavorites} new favorites

Write a short paragraph summarizing what this user has been learning about.`;

      const { generateInsightsNarrative } = await import("../utils/aiAgents");
      const insightsData = {
        timeRange,
        topTopics: topTopics.map(t => t.topic),
        topPacks: topPacks.map(p => p.pack.pack_title),
        topSources: topSources.map(s => s.source),
        stats: activityStats
      };
      const result = await generateInsightsNarrative(insightsData);
      
      setAiSummary(result);
    } catch (error) {
      console.error("Failed to generate AI summary:", error);
    }
    setGeneratingAI(false);
  };

  const openPack = (pack) => {
    logPackView(pack.id);
    const params = new URLSearchParams({
      pack_id: pack.id,
      pack_title: pack.pack_title
    });
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  const searchTopic = (topic) => {
    const params = new URLSearchParams({ keywords: topic });
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  if (!hasActivity) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            My Library Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-600">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">Once you start exploring Learning Packs and running searches, your Insights will appear here.</p>
            <p className="text-xs text-slate-500 mt-2">Try opening a pack or saving a search to get started!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            My Library Insights
          </CardTitle>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Activity Snapshot */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4 text-center">
              <Activity className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-900">{activityStats.searches}</p>
              <p className="text-xs text-blue-700">Searches Run</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4 text-center">
              <BookOpen className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-900">{activityStats.packsOpened}</p>
              <p className="text-xs text-green-700">Packs Opened</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4 text-center">
              <Newspaper className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold text-purple-900">{activityStats.summaries}</p>
              <p className="text-xs text-purple-700">Summaries</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold text-yellow-900">{activityStats.newFavorites}</p>
              <p className="text-xs text-yellow-700">New Favorites</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Summary */}
        {aiSummary ? (
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0" />
                <p className="text-sm text-slate-700 leading-relaxed">{aiSummary}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={generateAISummary}
            disabled={generatingAI}
            className="w-full"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {generatingAI ? "Generating summary..." : "Generate AI Summary"}
          </Button>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Topics */}
          {topTopics.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-600" />
                Your Top Topics
              </h4>
              <div className="flex flex-wrap gap-2">
                {topTopics.map(({ topic, count }) => (
                  <Badge
                    key={topic}
                    variant="secondary"
                    className="cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => searchTopic(topic)}
                  >
                    {topic} <span className="ml-1 text-slate-500">({count})</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Top Sources */}
          {topSources.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-slate-600" />
                Where You're Reading From
              </h4>
              <div className="space-y-2">
                {topSources.map(({ source, count }) => (
                  <div key={source} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{source}</span>
                    <div className="flex items-center gap-2">
                      <div className="bg-slate-200 h-2 rounded-full w-20 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full"
                          style={{ width: `${Math.min(100, (count / topSources[0].count) * 100)}%` }}
                        />
                      </div>
                      <span className="text-slate-500 text-xs w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Most Opened Packs */}
        {topPacks.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-600" />
              Most Opened Packs
            </h4>
            <div className="grid md:grid-cols-3 gap-3">
              {topPacks.map(({ pack, count, isFavorite }) => (
                <Card
                  key={pack.id}
                  className="cursor-pointer hover:shadow-md transition-all"
                  onClick={() => openPack(pack)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-1">
                        {pack.icon && <span className="text-lg">{pack.icon}</span>}
                        {isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-400" />}
                      </div>
                      <Badge variant="secondary" className="text-xs">{count} views</Badge>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 line-clamp-2">{pack.pack_title}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}