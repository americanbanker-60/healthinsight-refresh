import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Sparkles, Building2, TrendingUp, DollarSign, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

const EXAMPLE_QUERIES = [
  "behavioral health M&A activity",
  "telehealth funding rounds 2024",
  "urgent care consolidation trends",
  "value-based care partnerships",
];

export default function DashboardSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [showAllNewsletters, setShowAllNewsletters] = useState(false);

  const handleSearch = async (q) => {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setQuery(searchQuery);
    setLoading(true);
    setResults(null);
    setShowAllNewsletters(false);

    const response = await base44.functions.invoke('intelligenceSearch', { query: searchQuery });
    setResults(response.data);
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const displayedNewsletters = showAllNewsletters
    ? results?.matched_newsletters
    : results?.matched_newsletters?.slice(0, 4);

  return (
    <div className="mb-8">
      {/* Search Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-blue-200" />
          <h2 className="text-white font-semibold text-lg">Intelligence Search</h2>
          <Badge className="bg-white/20 text-white border-0 text-xs">AI-Powered</Badge>
        </div>
        <p className="text-blue-100 text-sm mb-4">
          Search across {results?.total_searched ? `${results.total_searched}+` : "all"} analyzed newsletters with AI synthesis
        </p>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. behavioral health M&A, telehealth funding, urgent care trends..."
            className="bg-white/95 border-0 text-slate-900 placeholder:text-slate-400 flex-1 h-11"
          />
          <Button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="bg-white text-blue-700 hover:bg-blue-50 font-semibold h-11 px-6 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
        {/* Example queries */}
        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLE_QUERIES.map((eq) => (
            <button
              key={eq}
              onClick={() => handleSearch(eq)}
              className="text-xs text-blue-100 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors"
            >
              {eq}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-center justify-center gap-3 text-slate-500 py-8"
          >
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Analyzing {results?.total_searched || ""}  newsletters for <em>"{query}"</em>...</span>
          </motion.div>
        )}

        {results && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 space-y-4"
          >
            {/* Summary bar */}
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Search className="w-4 h-4" />
              <span>
                Found <strong className="text-slate-800">{results.relevant_found}</strong> relevant articles
                across <strong className="text-slate-800">{results.total_searched}</strong> total newsletters
              </span>
            </div>

            {/* AI Synthesis Card */}
            {results.ai_synthesis && (
              <Card className="border-blue-200 bg-blue-50/60">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-base flex items-center gap-2 text-blue-900">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    AI Intelligence Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Direct answer */}
                  <p className="text-slate-800 text-sm leading-relaxed font-medium">
                    {results.ai_synthesis.direct_answer}
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Key findings */}
                    {results.ai_synthesis.key_findings?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> Key Findings
                        </p>
                        <ul className="space-y-1.5">
                          {results.ai_synthesis.key_findings.map((f, i) => (
                            <li key={i} className="text-xs text-slate-700 flex gap-2">
                              <span className="text-blue-500 font-bold shrink-0">•</span>
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* M&A and Funding */}
                      {results.ai_synthesis.ma_and_funding?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" /> M&A & Funding
                          </p>
                          <ul className="space-y-1.5">
                            {results.ai_synthesis.ma_and_funding.map((m, i) => (
                              <li key={i} className="text-xs text-slate-700 flex gap-2">
                                <span className="text-green-500 font-bold shrink-0">•</span>
                                {m}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Notable players */}
                      {results.ai_synthesis.notable_players?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" /> Key Players
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {results.ai_synthesis.notable_players.map((p, i) => (
                              <Badge key={i} variant="outline" className="text-xs bg-white">
                                {p}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* What to watch */}
                  {results.ai_synthesis.what_to_watch && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-amber-800 mb-1">📌 What to Watch</p>
                      <p className="text-xs text-amber-900">{results.ai_synthesis.what_to_watch}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Matched Newsletter Cards */}
            {results.matched_newsletters?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Source Articles ({results.matched_newsletters.length})
                </p>
                <div className="grid gap-2">
                  {displayedNewsletters.map((n) => (
                    <Link key={n.id} to={`${createPageUrl("NewsletterDetail")}?id=${n.id}`}>
                      <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer border-slate-200">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 text-sm truncate">{n.title}</p>
                              {n.tldr && (
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{n.tldr}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {n.sentiment && (
                                <Badge variant="outline" className="text-xs capitalize hidden md:flex">
                                  {n.sentiment}
                                </Badge>
                              )}
                              <span className="text-xs text-slate-400">
                                {n.source_name}
                              </span>
                              <Eye className="w-3.5 h-3.5 text-slate-300" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>

                {results.matched_newsletters.length > 4 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllNewsletters(!showAllNewsletters)}
                    className="mt-2 w-full text-slate-500"
                  >
                    {showAllNewsletters ? (
                      <><ChevronUp className="w-4 h-4 mr-1" /> Show Less</>
                    ) : (
                      <><ChevronDown className="w-4 h-4 mr-1" /> Show All {results.matched_newsletters.length} Articles</>
                    )}
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}