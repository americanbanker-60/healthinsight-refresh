import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, Star } from "lucide-react";
import { subDays } from "date-fns";
import { logPackView } from "../utils/packTracking";

export default function RecommendedSection() {
  const navigate = useNavigate();

  const { data: allPacks = [] } = useQuery({
    queryKey: ['learningPacks'],
    queryFn: () => base44.entities.LearningPack.list("sort_order"),
    initialData: [],
  });

  const { data: recentViews = [] } = useQuery({
    queryKey: ['recentlyViewedPacks'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const views = await base44.entities.RecentlyViewedPack.filter(
        { created_by: user.email },
        "-viewed_at"
      );
      return views.filter(v => new Date(v.viewed_at) >= subDays(new Date(), 30));
    },
    initialData: [],
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favoritePacks'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.FavoritePack.filter(
        { created_by: user.email },
        "-favorited_at"
      );
    },
    initialData: [],
  });

  const { data: searchActivity = [] } = useQuery({
    queryKey: ['userSearchActivity'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const activities = await base44.entities.UserSearchActivity.filter(
        { created_by: user.email },
        "-executed_at"
      );
      return activities.filter(a => new Date(a.executed_at || a.created_date) >= subDays(new Date(), 30));
    },
    initialData: [],
  });

  const recommendedPacks = useMemo(() => {
    if (allPacks.length === 0) return [];

    const viewedPackIds = recentViews.map(v => v.pack_id);
    const favoritePackIds = favorites.map(f => f.pack_id);
    
    const topicCounts = {};
    searchActivity.forEach(activity => {
      if (activity.keywords) {
        activity.keywords.toLowerCase().split(/\s+/).forEach(kw => {
          if (kw.length > 3) topicCounts[kw] = (topicCounts[kw] || 0) + 1;
        });
      }
    });

    const scored = allPacks.map(pack => {
      let score = 0;
      
      if (viewedPackIds.includes(pack.id)) score += 2;
      if (favoritePackIds.includes(pack.id)) score += 5;
      
      const packKeywords = (pack.keywords || "").toLowerCase();
      Object.keys(topicCounts).forEach(topic => {
        if (packKeywords.includes(topic)) score += topicCounts[topic];
      });
      
      return { pack, score };
    });

    scored.sort((a, b) => b.score - a.score);
    
    if (scored[0]?.score > 0) {
      return scored.slice(0, 3).map(item => item.pack);
    }
    
    return allPacks.slice(0, 3);
  }, [allPacks, recentViews, favorites, searchActivity]);

  const openPack = (pack) => {
    logPackView(pack.id);
    const params = new URLSearchParams({
      pack_id: pack.id,
      pack_title: pack.pack_title
    });
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-purple-600" />
          Recommended for You
        </h2>
        <p className="text-slate-600">
          Packs tailored to your recent activity and interests
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {recommendedPacks.map(pack => {
          const isFavorite = favorites.some(f => f.pack_id === pack.id);
          return (
            <Card 
              key={pack.id} 
              className="hover:shadow-lg transition-all cursor-pointer"
              onClick={() => openPack(pack)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {pack.icon && <span className="text-2xl">{pack.icon}</span>}
                    {isFavorite && <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />}
                  </div>
                  {pack.category && (
                    <Badge variant="outline" className="text-xs">
                      {pack.category}
                    </Badge>
                  )}
                </div>
                
                <h3 className="font-semibold text-slate-900 mb-2">
                  {pack.pack_title}
                </h3>
                
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                  {pack.description}
                </p>

                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    openPack(pack);
                  }}
                >
                  Open Pack
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}