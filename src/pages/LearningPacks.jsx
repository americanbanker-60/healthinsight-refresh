import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Sparkles, Calendar, Search, Star } from "lucide-react";
import { GridCardSkeleton } from "../components/common/CardSkeleton";
import { CategoryBadge } from "../components/common/CategoryBadge";
import { StyledCard } from "../components/common/StyledCard";
import { PrimaryButton } from "../components/common/PrimaryButton";
import EmptyState from "../components/common/EmptyState";
import RecommendedPacks from "../components/packs/RecommendedPacks";
import RecentlyViewedPacks from "../components/packs/RecentlyViewedPacks";
import FavoritePacks from "../components/packs/FavoritePacks";
import FavoriteButton from "../components/packs/FavoriteButton";
import { logPackView } from "../components/utils/packTracking";

const categoryColors = {
  "Care Models": "bg-blue-100 text-blue-700 border-blue-200",
  "Payor Topics": "bg-green-100 text-green-700 border-green-200",
  "Technology": "bg-purple-100 text-purple-700 border-purple-200",
  "Provider Operations": "bg-orange-100 text-orange-700 border-orange-200",
  "Policy & Regulation": "bg-red-100 text-red-700 border-red-200"
};

export default function LearningPacks() {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState("order");
  const [lastOpenedPackId, setLastOpenedPackId] = useState(null);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  const { data: packs = [], isLoading } = useQuery({
    queryKey: ['learningPacks'],
    queryFn: () => base44.entities.LearningPack.list(sortBy === "order" ? "sort_order" : "pack_title"),
    initialData: [],
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favoritePacks'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.FavoritePack.filter({ created_by: user.email });
    },
    initialData: [],
  });

  const openPack = (pack) => {
    setLastOpenedPackId(pack.id);
    logPackView(pack.id);
    const params = new URLSearchParams({
      pack_id: pack.id,
      pack_title: pack.pack_title
    });
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  const filteredPacks = showOnlyFavorites
    ? packs.filter(pack => favorites.some(fav => fav.pack_id === pack.id))
    : packs;

  const groupedPacks = filteredPacks.reduce((acc, pack) => {
    const category = pack.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(pack);
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Learning Packs</h1>
            <p className="text-slate-600 text-lg mt-1">
              Choose a Learning Pack to instantly explore curated content across all sources
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 mb-8">
        <FavoritePacks variant="full" maxItems={6} />
        <RecentlyViewedPacks variant="full" maxItems={5} />
        {lastOpenedPackId && (
          <RecommendedPacks currentPackId={lastOpenedPackId} />
        )}
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">All Learning Packs</h2>
        <Button
          variant={showOnlyFavorites ? "default" : "outline"}
          onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
          className="gap-2"
        >
          <Star className={`w-4 h-4 ${showOnlyFavorites ? "fill-yellow-400 text-yellow-400" : ""}`} />
          {showOnlyFavorites ? "Show All" : "Show Favorites Only"}
        </Button>
      </div>

      {isLoading ? (
        <GridCardSkeleton count={6} />
      ) : (
        <div className="space-y-8">
          {Object.keys(groupedPacks).sort().map(category => (
            <div key={category}>
              <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                {category}
                <Badge variant="outline">{groupedPacks[category].length}</Badge>
              </h2>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedPacks[category].map(pack => (
                  <StyledCard
                    key={pack.id}
                    onClick={() => openPack(pack)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {pack.icon && (
                            <div className="text-4xl mb-2">{pack.icon}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div onClick={(e) => e.stopPropagation()}>
                            <FavoriteButton packId={pack.id} variant="icon" />
                          </div>
                          {pack.category && <CategoryBadge category={pack.category} />}
                        </div>
                      </div>
                      <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                        {pack.pack_title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {pack.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 text-xs">
                        {pack.keywords && (
                          <div className="flex items-center gap-1 text-slate-500">
                            <Search className="w-3 h-3" />
                            <span className="italic">"{pack.keywords}"</span>
                          </div>
                        )}
                        {pack.date_range_type && (
                          <div className="flex items-center gap-1 text-slate-500">
                            <Calendar className="w-3 h-3" />
                            <span>{pack.date_range_type === "7d" ? "7 days" : pack.date_range_type === "30d" ? "30 days" : pack.date_range_type === "90d" ? "90 days" : "YTD"}</span>
                          </div>
                        )}
                      </div>

                      <PrimaryButton
                        className="w-full group-hover:shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPack(pack);
                        }}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Open Pack
                      </PrimaryButton>
                    </CardContent>
                  </StyledCard>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredPacks.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title={showOnlyFavorites ? "No Favorite Packs" : "No Learning Packs Yet"}
          description={showOnlyFavorites ? "Star some packs to see them here" : "Learning packs will appear here once created"}
        />
      )}
    </div>
  );
}