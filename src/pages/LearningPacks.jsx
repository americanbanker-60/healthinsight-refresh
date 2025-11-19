import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Sparkles, Calendar, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import RecommendedPacks from "../components/packs/RecommendedPacks";
import RecentlyViewedPacks from "../components/packs/RecentlyViewedPacks";
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

  const { data: packs = [], isLoading } = useQuery({
    queryKey: ['learningPacks'],
    queryFn: () => base44.entities.LearningPack.list(sortBy === "order" ? "sort_order" : "pack_title"),
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

  const groupedPacks = packs.reduce((acc, pack) => {
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

      <div className="mb-6">
        <RecentlyViewedPacks variant="full" maxItems={5} />
      </div>

      {lastOpenedPackId && (
        <div className="mb-6">
          <RecommendedPacks currentPackId={lastOpenedPackId} />
        </div>
      )}

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
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
                  <Card
                    key={pack.id}
                    className="bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 border-slate-200/60 group cursor-pointer"
                    onClick={() => openPack(pack)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-2">
                        {pack.icon && (
                          <div className="text-4xl mb-2">{pack.icon}</div>
                        )}
                        {pack.category && (
                          <Badge className={categoryColors[pack.category] || "bg-slate-100 text-slate-700"}>
                            {pack.category}
                          </Badge>
                        )}
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

                      <Button
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 group-hover:shadow-lg transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPack(pack);
                        }}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Open Pack
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && packs.length === 0 && (
        <Card className="bg-white/80 backdrop-blur-sm text-center py-16">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Learning Packs Yet</h3>
          <p className="text-slate-500">Learning packs will appear here once created</p>
        </Card>
      )}
    </div>
  );
}