import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Sparkles, ArrowRight } from "lucide-react";
import { logPackView } from "../utils/packTracking";
import FavoriteButton from "./FavoriteButton";

export default function RecommendedPacks({ 
  currentPackId = null, 
  searchKeywords = "", 
  selectedTopics = [],
  selectedNewsletters = [],
  newsletters = []
}) {
  const navigate = useNavigate();

  const { data: allPacks = [] } = useQuery({
    queryKey: ['learningPacks'],
    queryFn: () => base44.entities.LearningPack.list("sort_order"),
    initialData: [],
  });

  const recommendedPacks = useMemo(() => {
    if (allPacks.length === 0) return [];

    // 1. If user opened a Learning Pack, show related packs
    if (currentPackId) {
      const currentPack = allPacks.find(p => p.id === currentPackId);
      if (currentPack?.related_pack_ids && currentPack.related_pack_ids.length > 0) {
        const related = allPacks.filter(p => currentPack.related_pack_ids.includes(p.id));
        if (related.length > 0) return related.slice(0, 3);
      }
    }

    // 2. If user performed a search, match by keywords/topics
    if (searchKeywords.trim()) {
      const keywords = searchKeywords.toLowerCase().split(/\s+/);
      const scored = allPacks.map(pack => {
        let score = 0;
        const packKeywords = (pack.keywords || "").toLowerCase();
        const packTopics = pack.topics_selected || [];
        
        keywords.forEach(kw => {
          if (packKeywords.includes(kw)) score += 3;
          if (packTopics.some(t => t.toLowerCase().includes(kw))) score += 2;
        });
        
        return { pack, score };
      }).filter(item => item.score > 0);
      
      if (scored.length > 0) {
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 3).map(item => item.pack);
      }
    }

    // 3. If user selected newsletters for summary, match by topics
    if (selectedNewsletters.length > 0 && newsletters.length > 0) {
      const selectedItems = newsletters.filter(n => selectedNewsletters.includes(n.id));
      const topicCounts = {};
      
      selectedItems.forEach(item => {
        if (item.themes) {
          item.themes.forEach(theme => {
            const topic = theme.theme?.toLowerCase();
            if (topic) {
              topicCounts[topic] = (topicCounts[topic] || 0) + 1;
            }
          });
        }
      });

      const scored = allPacks.map(pack => {
        let score = 0;
        const packTopics = (pack.topics_selected || []).map(t => t.toLowerCase());
        const packKeywords = (pack.keywords || "").toLowerCase().split(/\s+/);
        
        Object.keys(topicCounts).forEach(topic => {
          if (packTopics.some(pt => pt.includes(topic) || topic.includes(pt))) {
            score += topicCounts[topic] * 2;
          }
          if (packKeywords.some(kw => topic.includes(kw) || kw.includes(topic))) {
            score += topicCounts[topic];
          }
        });
        
        return { pack, score };
      }).filter(item => item.score > 0);
      
      if (scored.length > 0) {
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 3).map(item => item.pack);
      }
    }

    // 4. Match by selected topics filter
    if (selectedTopics.length > 0) {
      const scored = allPacks.map(pack => {
        let score = 0;
        const packTopics = (pack.topics_selected || []).map(t => t.toLowerCase());
        const packKeywords = (pack.keywords || "").toLowerCase();
        
        selectedTopics.forEach(topic => {
          const topicLower = topic.toLowerCase();
          if (packTopics.some(pt => pt.includes(topicLower))) score += 3;
          if (packKeywords.includes(topicLower)) score += 2;
        });
        
        return { pack, score };
      }).filter(item => item.score > 0);
      
      if (scored.length > 0) {
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 3).map(item => item.pack);
      }
    }

    // 5. Fallback: show top packs by sort_order
    return allPacks.slice(0, 3);
  }, [allPacks, currentPackId, searchKeywords, selectedTopics, selectedNewsletters, newsletters]);

  const openPack = (pack) => {
    logPackView(pack.id);
    const params = new URLSearchParams({
      pack_id: pack.id,
      pack_title: pack.pack_title
    });
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  if (recommendedPacks.length === 0) return null;

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            Recommended Learning Packs
          </CardTitle>
          <Link to={createPageUrl("LearningPacks")}>
            <Button variant="ghost" size="sm" className="text-xs">
              Show more
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {recommendedPacks.map(pack => (
            <Card
              key={pack.id}
              className="bg-white hover:shadow-md transition-all cursor-pointer group border-slate-200 flex flex-col"
              onClick={() => openPack(pack)}
            >
              <CardContent className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-2 min-h-[32px]">
                  {pack.icon && <div className="text-2xl flex-shrink-0">{pack.icon}</div>}
                  <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                    <div onClick={(e) => e.stopPropagation()}>
                      <FavoriteButton packId={pack.id} variant="icon" />
                    </div>
                  </div>
                </div>
                <h4 className="font-semibold text-sm text-slate-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[40px]">
                  {pack.pack_title}
                </h4>
                <p className="text-xs text-slate-600 mb-3 line-clamp-2 flex-1">
                  {pack.description}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs mt-auto"
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