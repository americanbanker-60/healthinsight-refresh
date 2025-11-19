import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Clock, BookOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function RecentlyViewedPacks({ variant = "full", maxItems = 5 }) {
  const navigate = useNavigate();

  const { data: recentViews = [] } = useQuery({
    queryKey: ['recentlyViewedPacks'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const views = await base44.entities.RecentlyViewedPack.filter(
        { created_by: user.email },
        "-viewed_at",
        maxItems
      );
      return views;
    },
    initialData: [],
  });

  const { data: allPacks = [] } = useQuery({
    queryKey: ['learningPacks'],
    queryFn: () => base44.entities.LearningPack.list("sort_order"),
    initialData: [],
  });

  const recentPacks = recentViews
    .map(view => {
      const pack = allPacks.find(p => p.id === view.pack_id);
      return pack ? { ...pack, viewed_at: view.viewed_at } : null;
    })
    .filter(Boolean)
    .slice(0, maxItems);

  const openPack = (pack) => {
    const params = new URLSearchParams({
      pack_id: pack.id,
      pack_title: pack.pack_title
    });
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  if (recentPacks.length === 0) {
    if (variant === "compact") return null;
    
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            Recently Viewed Packs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-slate-500 text-sm">
            <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p>You haven't opened any Learning Packs yet.</p>
            <p className="text-xs mt-1">Explore the packs below to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "compact") {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            Recently Viewed Packs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {recentPacks.map(pack => (
              <div
                key={pack.id}
                onClick={() => openPack(pack)}
                className="min-w-[180px] p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer bg-white"
              >
                <div className="flex items-center gap-2 mb-1">
                  {pack.icon && <span className="text-xl">{pack.icon}</span>}
                  <span className="text-xs font-semibold text-slate-900 line-clamp-1">
                    {pack.pack_title}
                  </span>
                </div>
                {pack.viewed_at && (
                  <p className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(pack.viewed_at), { addSuffix: true })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          Recently Viewed Packs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {recentPacks.map(pack => (
            <Card
              key={pack.id}
              className="bg-white hover:shadow-md transition-all cursor-pointer group border-slate-200"
              onClick={() => openPack(pack)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  {pack.icon && <div className="text-2xl">{pack.icon}</div>}
                  {pack.category && (
                    <Badge variant="outline" className="text-xs">
                      {pack.category}
                    </Badge>
                  )}
                </div>
                <h4 className="font-semibold text-sm text-slate-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {pack.pack_title}
                </h4>
                {pack.viewed_at && (
                  <p className="text-xs text-slate-500 mb-3">
                    {formatDistanceToNow(new Date(pack.viewed_at), { addSuffix: true })}
                  </p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    openPack(pack);
                  }}
                >
                  <BookOpen className="w-3 h-3 mr-1" />
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