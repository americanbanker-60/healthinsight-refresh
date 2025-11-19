import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, ArrowRight, Sparkles } from "lucide-react";

export default function FeaturedPacks() {
  const navigate = useNavigate();

  const { data: packs = [] } = useQuery({
    queryKey: ['learningPacks'],
    queryFn: () => base44.entities.LearningPack.list("sort_order", 6),
    initialData: [],
  });

  const openPack = (pack) => {
    const params = new URLSearchParams({
      pack_id: pack.id,
      pack_title: pack.pack_title
    });
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  if (packs.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-600" />
          <h2 className="text-2xl font-bold text-slate-900">Learning Packs</h2>
        </div>
        <Link to={createPageUrl("LearningPacks")}>
          <Button variant="outline" size="sm">
            View All
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packs.slice(0, 6).map(pack => (
          <Card
            key={pack.id}
            className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all border-slate-200/60 cursor-pointer group"
            onClick={() => openPack(pack)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                {pack.icon && <div className="text-3xl">{pack.icon}</div>}
                {pack.category && (
                  <Badge variant="outline" className="text-xs">
                    {pack.category}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base group-hover:text-blue-600 transition-colors">
                {pack.pack_title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                {pack.description}
              </p>
              <Button
                size="sm"
                className="w-full"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  openPack(pack);
                }}
              >
                <Sparkles className="w-3 h-3 mr-2" />
                Open Pack
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}