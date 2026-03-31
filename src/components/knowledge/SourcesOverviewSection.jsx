import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Newspaper, ExternalLink } from "lucide-react";

export default function SourcesOverviewSection() {
  const navigate = useNavigate();

  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: () => base44.entities.Source.list("name"),
    initialData: [],
  });

  const { data: newsletters = [] } = useQuery({
    queryKey: ['all-newsletters'],
    queryFn: () => base44.entities.NewsletterItem.list("-publication_date", 500),
    initialData: [],
  });

  const activeSources = sources.filter(s => s && typeof s === 'object' && !s.is_deleted && s.name && s.id);

  const viewSourceContent = (sourceName) => {
    const params = new URLSearchParams();
    params.set('sources', sourceName);
    params.set('date_range', '30d');
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  const getSourceCount = (sourceName) => {
    return newsletters.filter(n => n.source_name === sourceName).length;
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Sources in This Hub</h2>
        <p className="text-slate-600">
          Explore newsletters from leading healthcare intelligence sources
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeSources.map(source => {
          if (!source || !source.name) return null;
          const count = getSourceCount(source.name);
          return (
            <Card key={source.id} className="hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Newspaper className="w-6 h-6 text-blue-600" />
                  {source.category && (
                    <Badge variant="outline" className="text-xs">
                      {source.category}
                    </Badge>
                  )}
                </div>
                
                <h3 className="font-semibold text-slate-900 mb-2">
                  {source.name}
                </h3>
                
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                  {source.description || "Healthcare newsletter source"}
                </p>

                {count > 0 && (
                  <p className="text-xs text-slate-500 mb-3">
                    {count} items indexed
                  </p>
                )}

                <div className="space-y-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full"
                    onClick={() => viewSourceContent(source.name)}
                  >
                    View Latest from This Source
                  </Button>
                  {source.url && (
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center text-xs text-blue-600 hover:text-blue-700 gap-1"
                    >
                      Visit website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}