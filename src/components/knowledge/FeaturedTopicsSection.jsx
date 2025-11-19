import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Search, Sparkles } from "lucide-react";
import { logPackView } from "../utils/packTracking";

export default function FeaturedTopicsSection() {
  const navigate = useNavigate();

  const { data: packs = [] } = useQuery({
    queryKey: ['learningPacks'],
    queryFn: () => base44.entities.LearningPack.list("sort_order"),
    initialData: [],
  });

  const featuredPacks = packs.slice(0, 8);

  const openPack = (pack) => {
    logPackView(pack.id);
    const params = new URLSearchParams({
      pack_id: pack.id,
      pack_title: pack.pack_title
    });
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  const exploreTopic = (keywords) => {
    const params = new URLSearchParams({ keywords });
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Featured Topics & Packs</h2>
        <p className="text-slate-600">
          Jump into curated content collections on key healthcare topics
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {featuredPacks.map(pack => (
          <Card 
            key={pack.id} 
            className="hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => openPack(pack)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                {pack.icon && <div className="text-3xl">{pack.icon}</div>}
                <Badge variant="secondary" className="text-xs">
                  Pack included
                </Badge>
              </div>
              
              <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                {pack.pack_title}
              </h3>
              
              <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                {pack.description}
              </p>

              <div className="space-y-2">
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    openPack(pack);
                  }}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Open Learning Pack
                </Button>
                {pack.keywords && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      exploreTopic(pack.keywords);
                    }}
                  >
                    <Search className="w-3 h-3 mr-1" />
                    Explore in All Sources
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 text-center">
        <Button 
          variant="outline"
          onClick={() => navigate(createPageUrl("LearningPacks"))}
        >
          View All Learning Packs
        </Button>
      </div>
    </div>
  );
}