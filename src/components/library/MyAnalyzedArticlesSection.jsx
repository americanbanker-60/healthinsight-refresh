import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookMarked, ExternalLink, ArrowUpDown, Filter, Search, Star, StickyNote, X } from "lucide-react";
import { format } from "date-fns";

const SECTORS = [
  "Urgent Care","Behavioral Health","Imaging","ASC","Physical Therapy",
  "Dental","Home Health","Anesthesia","MSO","Telehealth","Healthcare IT",
  "Pharmacy","Other"
];

const sentimentColors = {
  positive: "bg-green-100 text-green-800",
  neutral:  "bg-slate-100 text-slate-700",
  negative: "bg-red-100 text-red-800",
  mixed:    "bg-yellow-100 text-yellow-800",
};

export default function MyAnalyzedArticlesSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchText, setSearchText]     = useState("");
  const [sortOrder, setSortOrder]       = useState("newest");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [starredOnly, setStarredOnly]   = useState(false);
  const [localStarred, setLocalStarred] = useState({});   // id → bool (optimistic)

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
        if (data?.success && (data.items || []).length > 0) return dedup(data.items);
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

  // Seed local starred state from server data
  React.useEffect(() => {
    const initial = {};
    articles.forEach(a => { if (a.is_starred) initial[a.id] = true; });
    setLocalStarred(initial);
  }, [articles.map(a => a.id).join(",")]);

  const toggleStar = async (article, e) => {
    e.preventDefault();
    e.stopPropagation();
    const newVal = !localStarred[article.id];
    setLocalStarred(prev => ({ ...prev, [article.id]: newVal }));
    try {
      await base44.entities.NewsletterItem.update(article.id, { is_starred: newVal });
      queryClient.invalidateQueries({ queryKey: ["my-analyzed-articles"] });
    } catch (_) {
      setLocalStarred(prev => ({ ...prev, [article.id]: !newVal }));
    }
  };

  const sources = useMemo(() => {
    const s = new Set(articles.map(a => a.source_name).filter(Boolean));
    return Array.from(s).sort();
  }, [articles]);

  const sectorsPresent = useMemo(() => {
    const s = new Set(articles.map(a => a.primary_sector).filter(Boolean));
    return Array.from(s).sort();
  }, [articles]);

  const displayedArticles = useMemo(() => {
    let result = [...articles];

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(a =>
        (a.title || "").toLowerCase().includes(q) ||
        (a.tldr || "").toLowerCase().includes(q) ||
        (a.source_name || "").toLowerCase().includes(q)
      );
    }

    if (sourceFilter !== "all") result = result.filter(a => a.source_name === sourceFilter);
    if (sectorFilter !== "all") result = result.filter(a => a.primary_sector === sectorFilter);
    if (starredOnly)            result = result.filter(a => localStarred[a.id]);

    result.sort((a, b) => {
      const dA = new Date(a.publication_date || a.date_added_to_app || a.created_date || 0);
      const dB = new Date(b.publication_date || b.date_added_to_app || b.created_date || 0);
      return sortOrder === "newest" ? dB - dA : dA - dB;
    });

    return result;
  }, [articles, searchText, sortOrder, sourceFilter, sectorFilter, starredOnly, localStarred]);

  const hasActiveFilters = searchText || sourceFilter !== "all" || sectorFilter !== "all" || starredOnly;

  const clearFilters = () => {
    setSearchText("");
    setSourceFilter("all");
    setSectorFilter("all");
    setStarredOnly(false);
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
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-indigo-600" />
              My Analyzed Articles
              <span className="text-sm font-normal text-slate-500">
                ({displayedArticles.length}{hasActiveFilters ? ` of ${articles.length}` : ""})
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={starredOnly ? "default" : "outline"}
                size="sm"
                className={`h-8 text-xs gap-1 ${starredOnly ? "bg-amber-500 hover:bg-amber-600 border-amber-500" : ""}`}
                onClick={() => setStarredOnly(v => !v)}
              >
                <Star className={`w-3 h-3 ${starredOnly ? "fill-white" : ""}`} />
                Starred
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setSortOrder(o => o === "newest" ? "oldest" : "newest")}
              >
                <ArrowUpDown className="w-3 h-3" />
                {sortOrder === "newest" ? "Newest" : "Oldest"}
              </Button>
            </div>
          </div>

          {/* Search + filters row */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Search articles…"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            {sources.length > 0 && (
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <Filter className="w-3 h-3 mr-1 text-slate-400" />
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {sectorsPresent.length > 0 && (
              <Select value={sectorFilter} onValueChange={setSectorFilter}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="All Sectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  {sectorsPresent.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500" onClick={clearFilters}>
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {displayedArticles.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No articles match your filters.
          </div>
        ) : (
          <div className="space-y-2">
            {displayedArticles.map((article) => {
              const pubDate = article.publication_date || article.date_added_to_app;
              const isStarred = !!localStarred[article.id];
              return (
                <div
                  key={article.id}
                  className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all"
                >
                  {/* Star button */}
                  <button
                    onClick={(e) => toggleStar(article, e)}
                    className={`shrink-0 p-1 rounded transition-colors ${isStarred ? "text-amber-400 hover:text-amber-500" : "text-slate-300 hover:text-amber-300"}`}
                    title={isStarred ? "Unstar" : "Star this article"}
                  >
                    <Star className={`w-4 h-4 ${isStarred ? "fill-amber-400" : ""}`} />
                  </button>

                  {/* Article info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate">{article.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {pubDate && (
                        <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {format(new Date(pubDate), "MMM d, yyyy")}
                        </span>
                      )}
                      {article.source_name && (
                        <span className="text-xs text-slate-500">{article.source_name}</span>
                      )}
                      {article.primary_sector && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">{article.primary_sector}</Badge>
                      )}
                      {article.sentiment && (
                        <Badge className={`text-xs px-1.5 py-0 ${sentimentColors[article.sentiment] || sentimentColors.neutral}`}>
                          {article.sentiment}
                        </Badge>
                      )}
                      {article.user_notes && (
                        <span title="Has notes" className="text-amber-400">
                          <StickyNote className="w-3 h-3 inline" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Open link */}
                  <Link
                    to={`${createPageUrl("NewsletterDetail")}?id=${article.id}`}
                    className="shrink-0 text-indigo-600 hover:text-indigo-800 p-1"
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
        )}
      </CardContent>
    </Card>
  );
}
