import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ExternalLink, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NewsletterCard from "../components/dashboard/NewsletterCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import AnalyzeNewsletterForm from "../components/source/AnalyzeNewsletterForm";

export default function SourcePage() {
  const [showAnalyze, setShowAnalyze] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchParams] = useSearchParams();
  const sourceName = searchParams.get('name');

  const { data: source, isLoading: sourceLoading } = useQuery({
    queryKey: ['source', sourceName],
    queryFn: async () => {
      const sources = await base44.entities.Source.filter({ name: sourceName });
      return sources[0];
    },
    enabled: !!sourceName,
  });

  const { data: newsletters, isLoading: newslettersLoading, refetch } = useQuery({
    queryKey: ['newsletters', sourceName],
    queryFn: () => base44.entities.Newsletter.filter({ source_name: sourceName }, "-created_date", 500),
    initialData: [],
    enabled: !!sourceName,
  });

  const filteredNewsletters = useMemo(() => {
    if (!searchText.trim()) return newsletters;
    
    const search = searchText.toLowerCase();
    return newsletters.filter(n => {
      const searchableText = [
        n.title || '',
        n.summary || '',
        n.tldr || '',
        ...(n.key_takeaways || []),
        ...(n.recommended_actions || []),
        ...(n.themes?.map(t => `${t.theme || ''} ${t.description || ''}`) || []),
        ...(n.key_players || []),
        ...(n.ma_activities?.map(ma => `${ma.acquirer || ''} ${ma.target || ''} ${ma.description || ''}`) || []),
        ...(n.funding_rounds?.map(fr => `${fr.company || ''} ${fr.description || ''}`) || []),
        ...(n.key_statistics?.map(ks => `${ks.figure || ''} ${ks.context || ''}`) || [])
      ].join(' ').toLowerCase();
      
      return searchableText.includes(search);
    });
  }, [newsletters, searchText]);

  if (sourceLoading) {
    return (
      <div className="p-10 max-w-7xl mx-auto">
        <Skeleton className="h-12 w-1/3 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
      </div>
    );
  }

  if (!source) {
    return (
      <div className="p-10 text-center">
        <p className="text-slate-500">Source not found</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{source.name}</h1>
            {source.url && (
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
          </div>
          {source.description && (
            <p className="text-slate-600 text-lg">{source.description}</p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline">{newsletters.length} newsletters</Badge>
            {searchText && (
              <Badge variant="secondary">{filteredNewsletters.length} matching</Badge>
            )}
          </div>
        </div>
        <Button 
          onClick={() => setShowAnalyze(!showAnalyze)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30"
        >
          <Plus className="w-5 h-5 mr-2" />
          Analyze Newsletter
        </Button>
      </div>

      <AnimatePresence>
        {showAnalyze && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8"
          >
            <AnalyzeNewsletterForm 
              sourceName={sourceName}
              onSuccess={() => {
                setShowAnalyze(false);
                refetch();
              }}
              onCancel={() => setShowAnalyze(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Search across all newsletter content (titles, summaries, takeaways, M&A, funding, etc.)..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-10 text-lg"
        />
      </div>

      <div className="grid gap-6">
        <AnimatePresence mode="wait">
          {newslettersLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/60">
                <Skeleton className="h-8 w-2/3 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mb-4" />
              </div>
            ))
          ) : filteredNewsletters.length === 0 && searchText ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No matching newsletters</h3>
              <p className="text-slate-500">Try a different search term</p>
            </motion.div>
          ) : newsletters.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No newsletters yet</h3>
              <p className="text-slate-500 mb-6">Start analyzing newsletters from {source.name}</p>
              <Button onClick={() => setShowAnalyze(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Analyze First Newsletter
              </Button>
            </motion.div>
          ) : (
            filteredNewsletters.map((newsletter, index) => (
              <NewsletterCard key={newsletter.id} newsletter={newsletter} index={index} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}