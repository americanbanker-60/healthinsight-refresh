import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Search, FileText, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { logPackView } from "../utils/packTracking";

export default function ContinueSection() {
  const navigate = useNavigate();

  const { data: recentViews = [] } = useQuery({
    queryKey: ['recentlyViewedPacks'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.RecentlyViewedPack.filter(
        { created_by: user.email },
        "-viewed_at",
        1
      );
    },
    initialData: [],
  });

  const { data: searchActivity = [] } = useQuery({
    queryKey: ['userSearchActivity'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.UserSearchActivity.filter(
        { created_by: user.email },
        "-executed_at",
        1
      );
    },
    initialData: [],
  });

  const { data: savedSummaries = [] } = useQuery({
    queryKey: ['savedSummaries'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.SavedSummary.filter(
        { created_by: user.email },
        "-created_date",
        1
      );
    },
    initialData: [],
  });

  const { data: allPacks = [] } = useQuery({
    queryKey: ['learningPacks'],
    queryFn: () => base44.entities.LearningPack.list("sort_order"),
    initialData: [],
  });

  const recentPack = recentViews.length > 0 
    ? allPacks.find(p => p.id === recentViews[0].pack_id)
    : null;

  const recentSearch = searchActivity.length > 0 ? searchActivity[0] : null;
  const recentSummary = savedSummaries.length > 0 ? savedSummaries[0] : null;

  const hasActivity = recentPack || recentSearch || recentSummary;

  const openPack = (pack) => {
    logPackView(pack.id);
    const params = new URLSearchParams({
      pack_id: pack.id,
      pack_title: pack.pack_title
    });
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  const runSearch = (search) => {
    const params = new URLSearchParams();
    if (search.keywords) params.set('keywords', search.keywords);
    if (search.sources_selected?.length) params.set('sources', search.sources_selected.join(','));
    if (search.topics_selected?.length) params.set('topics', search.topics_selected.join(','));
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  if (!hasActivity) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-600 mb-2">
            Once you start exploring and saving searches or summaries, shortcuts will appear here.
          </p>
          <Button 
            variant="outline"
            onClick={() => navigate(createPageUrl("ExploreAllSources"))}
            className="mt-4"
          >
            Start Exploring
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Continue Where You Left Off</h2>
        <p className="text-slate-600">
          Jump back into your recent activity
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {recentPack && (
          <Card className="hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-slate-700">Last Pack Opened</span>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                {recentPack.icon && <span className="text-2xl">{recentPack.icon}</span>}
                <h3 className="font-semibold text-slate-900 text-sm line-clamp-2">
                  {recentPack.pack_title}
                </h3>
              </div>
              
              {recentViews[0].viewed_at && (
                <p className="text-xs text-slate-500 mb-3">
                  {formatDistanceToNow(new Date(recentViews[0].viewed_at), { addSuffix: true })}
                </p>
              )}

              <Button 
                size="sm" 
                className="w-full"
                onClick={() => openPack(recentPack)}
              >
                Open Pack
              </Button>
            </CardContent>
          </Card>
        )}

        {recentSearch && (
          <Card className="hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-slate-700">Last Search Run</span>
              </div>
              
              <div className="mb-2">
                {recentSearch.keywords && (
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    "{recentSearch.keywords}"
                  </p>
                )}
                {recentSearch.topics_selected?.length > 0 && (
                  <p className="text-xs text-slate-600">
                    {recentSearch.topics_selected.length} topics
                  </p>
                )}
              </div>
              
              {recentSearch.executed_at && (
                <p className="text-xs text-slate-500 mb-3">
                  {formatDistanceToNow(new Date(recentSearch.executed_at), { addSuffix: true })}
                </p>
              )}

              <Button 
                size="sm" 
                variant="outline"
                className="w-full"
                onClick={() => runSearch(recentSearch)}
              >
                Run Search Again
              </Button>
            </CardContent>
          </Card>
        )}

        {recentSummary && (
          <Card className="hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-semibold text-slate-700">Recent Summary</span>
              </div>
              
              <h3 className="font-semibold text-slate-900 text-sm mb-2 line-clamp-2">
                {recentSummary.summary_title}
              </h3>
              
              {recentSummary.created_date && (
                <p className="text-xs text-slate-500 mb-3">
                  {formatDistanceToNow(new Date(recentSummary.created_date), { addSuffix: true })}
                </p>
              )}

              <Button 
                size="sm" 
                variant="outline"
                className="w-full"
                onClick={() => navigate(createPageUrl("MyLibrary"))}
              >
                Open in Library
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}