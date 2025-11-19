import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Clock, BookOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { logPackView } from "../utils/packTracking";

export default function RecentlyViewedSection() {
  const navigate = useNavigate();

  const { data: recentViews = [] } = useQuery({
    queryKey: ['recentlyViewedPacks'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.RecentlyViewedPack.filter(
        { created_by: user.email },
        "-viewed_at",
        5
      );
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
    .filter(Boolean);

  const openPack = (pack) => {
    logPackView(pack.id);
    const params = new URLSearchParams({
      pack_id: pack.id,
      pack_title: pack.pack_title
    });
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  if (recentPacks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            Recently Viewed Packs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-600">
            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">You haven't viewed any Learning Packs yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-600" />
          Recently Viewed Packs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {recentPacks.map(pack => (
            <div
              key={pack.id}
              onClick={() => openPack(pack)}
              className="min-w-[200px] p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer bg-white"
            >
              <div className="flex items-center gap-2 mb-2">
                {pack.icon && <span className="text-2xl">{pack.icon}</span>}
                <span className="text-sm font-semibold text-slate-900 line-clamp-1">
                  {pack.pack_title}
                </span>
              </div>
              {pack.viewed_at && (
                <p className="text-xs text-slate-500">
                  {formatDistanceToNow(new Date(pack.viewed_at), { addSuffix: true })}
                </p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-3 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  openPack(pack);
                }}
              >
                <BookOpen className="w-3 h-3 mr-1" />
                Open
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}