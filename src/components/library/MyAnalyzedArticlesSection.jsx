import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookMarked, ExternalLink, ArrowUpDown, Filter } from "lucide-react";
import { format } from "date-fns";

export default function MyAnalyzedArticlesSection() {
  const { user } = useAuth();
  const [sortOrder, setSortOrder] = useState("newest");
  const [sourceFilter, setSourceFilter] = useState("all");

  const LOCAL_KEY = user?.email ? `hi_analyzed_${user.email}` : null;

  const dedup = (items) => {
    const seenUrls = new Set();
    const seenTitles = new Set();
    return items.filter(n => {
      if (n.source_url) {
        if (seenUrls.has(n.source_url)) return false;
        seenUrls.add(n.source_url);
      } else if (n.title) {
        const key = n.title.trim().toLowerCase();
        if (seenTitles.has(key)) return false;
        seenTitles.add(key);
      }
      return true;
    });
  };

  const { data: articles = [] } = useQuery({
    queryKey: ["my-analyzed-articles", user?.email],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getMyNewsletters');
        const data = response?.data ?? response;
        if (data?.success && (data.items || []).length > 0) {
          return dedup(data.items);
        }
      } catch (_) {}

      try {
        if (LOCAL_KEY) {
          const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
          const analyzed = local.filter(n => !!n.is_analyzed || n.status === 'completed');
          if (analyzed.length > 0) return dedup(analyzed);
        }
      } catch (_) {}

      return [];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
    initialData: [],
  });

  // Unique sources for filter dropdown
  const sources = useMemo(() => {
    const s = new Set(articles.map(a => a.source_name).filter(Boolean));
    return Array.from(s).sort();
  }, [articles]);

  // Apply filter + sort
  const displayedArticles = useMemo(() => {
    let result = sourceFilter === "all"
      ? [...articles]
      : articles.filter(a => a.source_name === sourceFilter);

    result.sort((a, b) => {
      const dateA = new Date(a.publication_date || a.date_added_to_app || a.created_date || 0);
      const dateB = new Date(b.publication_date || b.date_added_to_app || b.created_date || 0);
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [articles, sortOrder, sourceFilter]);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-indigo-600" />
            My Analyzed Articles
            <span className="text-sm font-normal text-slate-500">({displayedArticles.length}{sourceFilter !== "all" ? ` of ${articles.length}` : ""})</span>
          </CardTitle>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Source filter */}
            {sources.length > 0 && (
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <Filter className="w-3 h-3 mr-1 text-slate-400" />
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {sources.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Sort toggle */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => setSortOrder(o => o === "newest" ? "oldest" : "newest")}
            >
              <ArrowUpDown className="w-3 h-3" />
              {sortOrder === "newest" ? "Newest First" : "Oldest First"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {displayedArticles.map((article) => {
            const pubDate = article.publication_date || article.date_added_to_app;
            return (
              <div
                key={article.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 truncate">{article.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {pubDate && (
                      <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {format(new Date(pubDate), "MMM d, yyyy")}
                      </span>
                    )}
                    {article.source_name && (
                      <span className="text-xs text-slate-500">{article.source_name}</span>
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
                  onClick={() => {
                    try {
                      if (article.id) sessionStorage.setItem(`newsletter_cache_${article.id}`, JSON.stringify(article));
                    } catch (_) {}
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}