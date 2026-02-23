import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, Lightbulb } from "lucide-react";

export default function FeaturedTopicsSection() {
  const navigate = useNavigate();

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list("sort_order"),
    initialData: [],
  });

  const featuredTopics = topics.slice(0, 8);

  const exploreTopic = (keywords) => {
    const searchTerms = Array.isArray(keywords) ? keywords.join(' ') : (typeof keywords === 'string' ? keywords : '');
    const params = new URLSearchParams({ keywords: searchTerms });
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Featured Topics</h2>
        <p className="text-sm md:text-base text-slate-600">
          Explore key healthcare topics and trends
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {featuredTopics.map(topic => (
          <Card 
            key={topic.id} 
            className="hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => topic.keywords && exploreTopic(topic.keywords)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                {topic.icon && <div className="text-3xl">{topic.icon}</div>}
              </div>
              
              <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                {topic.topic_name}
              </h3>
              
              <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                {topic.description || "Explore content related to this topic"}
              </p>

              {topic.keywords && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    exploreTopic(topic.keywords);
                  }}
                >
                  <Search className="w-3 h-3 mr-1" />
                  Explore Topic
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 text-center">
        <Button 
          variant="outline"
          onClick={() => navigate(createPageUrl("TopicsDirectory"))}
        >
          <Lightbulb className="w-4 h-4 mr-2" />
          View All Topics
        </Button>
      </div>
    </div>
  );
}