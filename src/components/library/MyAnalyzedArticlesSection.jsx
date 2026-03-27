import React from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookMarked, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export default function MyAnalyzedArticlesSection() {
  const { user } = useAuth();

  const { data: articles = [] } = useQuery({
    queryKey: ["my-analyzed-articles", user?.email],
    queryFn: async () => {
      // Server-side filter by created_by (platform auto-sets this on frontend entity creates).
      // This mirrors the pattern used by SavedSearchesSection which is known to work.
      const mine = await base44.entities.NewsletterItem.filter(
        { created_by: user.email },
        '-date_added_to_app'
      );
      return (mine || []).filter(n => !!n.is_analyzed || n.status === 'completed');
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
    initialData: [],
  });

  const sentimentColors = {
    positive: "bg-green-100 text-green-800",
    neutral: "bg-slate-100 text-slate-700",
    negative: "bg-red-100 text-red-800",
    mixed: "bg-yellow-100 text-yellow-800",
  };

  if (articles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-indigo-600" />
            My Analyzed Articles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BookMarked className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-600 mb-1">No articles analyzed yet.</p>
            <p className="text-xs text-slate-500">
              Go to <strong>Add to Library</strong> and analyze a URL or PDF — it will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-indigo-600" />
            My Analyzed Articles
          </CardTitle>
          <span className="text-sm text-slate-500">{articles.length} article{articles.length !== 1 ? "s" : ""}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-900 truncate">{article.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {article.source_name && (
                    <span className="text-xs text-slate-500">{article.source_name}</span>
                  )}
                  {article.date_added_to_app && (
                    <span className="text-xs text-slate-400">
                      · Added {format(new Date(article.date_added_to_app), "MMM d, yyyy")}
                    </span>
                  )}
                  {article.sentiment && (
                    <Badge className={`text-xs px-1.5 py-0 ${sentimentColors[article.sentiment] || sentimentColors.neutral}`}>
                      {article.sentiment}
                    </Badge>
                  )}
                </div>
              </div>
              <Link
                to={`${createPageUrl("NewsletterDetail")}?id=${article.id}`}
                className="shrink-0 text-indigo-600 hover:text-indigo-800"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}