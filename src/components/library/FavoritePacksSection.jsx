import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Star, Sparkles } from "lucide-react";
import { logPackView } from "../utils/packTracking";
import EmptyState from "../common/EmptyState";

export default function FavoritePacksSection() {
  const navigate = useNavigate();

  const { data: favorites = [] } = useQuery({
    queryKey: ['favoritePacks'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.FavoritePack.filter(
        { created_by: user.email },
        "-favorited_at",
        6
      );
    },
    initialData: [],
  });

  const { data: allPacks = [] } = useQuery({
    queryKey: ['learningPacks'],
    queryFn: () => base44.entities.LearningPack.list("sort_order"),
    initialData: [],
  });

  const favoritePacks = favorites
    .map(fav => allPacks.find(p => p.id === fav.pack_id))
    .filter(Boolean)
    .slice(0, 6);

  const openPack = (pack) => {
    logPackView(pack.id);
    const params = new URLSearchParams({
      pack_id: pack.id,
      pack_title: pack.pack_title
    });
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  if (favoritePacks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-600 fill-yellow-400" />
            Favorite Packs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Star}
            title="No Favorite Packs Yet"
            description="Star Learning Packs to quickly access them here"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-600 fill-yellow-400" />
            Favorite Packs
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl("LearningPacks"))}
          >
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favoritePacks.map(pack => (
            <Card
              key={pack.id}
              className="cursor-pointer hover:shadow-md transition-all group"
              onClick={() => openPack(pack)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {pack.icon && <div className="text-2xl">{pack.icon}</div>}
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                  </div>
                  {pack.category && (
                    <Badge variant="outline" className="text-xs">
                      {pack.category}
                    </Badge>
                  )}
                </div>
                <h4 className="font-semibold text-sm mb-2 group-hover:text-blue-600 transition-colors">
                  {pack.pack_title}
                </h4>
                <p className="text-xs text-slate-600 mb-3 line-clamp-2">
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
                  <Sparkles className="w-3 h-3 mr-1" />
                  Open Pack
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}