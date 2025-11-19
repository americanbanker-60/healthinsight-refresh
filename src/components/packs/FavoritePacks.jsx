import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Star, BookOpen, Sparkles } from "lucide-react";
import FavoriteButton from "./FavoriteButton";
import { logPackView } from "../utils/packTracking";

export default function FavoritePacks({ variant = "full", maxItems = 6 }) {
  const navigate = useNavigate();

  const { data: favorites = [] } = useQuery({
    queryKey: ['favoritePacks'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.FavoritePack.filter(
        { created_by: user.email },
        "-favorited_at",
        maxItems
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
    .slice(0, maxItems);

  const openPack = (pack) => {
    logPackView(pack.id);
    const params = new URLSearchParams({
      pack_id: pack.id,
      pack_title: pack.pack_title
    });
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  if (favoritePacks.length === 0) {
    if (variant === "compact") return null;

    return (
      <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-600 fill-yellow-400" />
            Favorite Packs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-600 text-sm">
            <Star className="w-12 h-12 mx-auto mb-3 text-yellow-300" />
            <p className="font-medium mb-1">You don't have any favorite packs yet.</p>
            <p className="text-xs">Tap the star icon on any pack to add it to your favorites.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "compact") {
    return (
      <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-600 fill-yellow-400" />
            Favorite Packs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {favoritePacks.map(pack => (
              <div
                key={pack.id}
                onClick={() => openPack(pack)}
                className="min-w-[180px] p-3 border border-yellow-200 rounded-lg hover:border-yellow-300 hover:shadow-sm transition-all cursor-pointer bg-white"
              >
                <div className="flex items-center gap-2 mb-1">
                  {pack.icon && <span className="text-xl">{pack.icon}</span>}
                  <span className="text-xs font-semibold text-slate-900 line-clamp-1">
                    {pack.pack_title}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-400" />
                  <span className="text-xs text-slate-500">Favorite</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200/60">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-600 fill-yellow-400" />
          Favorite Packs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favoritePacks.map(pack => (
            <Card
              key={pack.id}
              className="bg-white hover:shadow-lg transition-all cursor-pointer group border-slate-200"
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
                <h4 className="font-semibold text-sm text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {pack.pack_title}
                </h4>
                <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                  {pack.description}
                </p>
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700"
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