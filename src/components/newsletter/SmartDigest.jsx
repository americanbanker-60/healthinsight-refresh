import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCw, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

const SENTIMENT_CONFIG = {
  bullish:  { label: "Bullish",  color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: TrendingUp,   iconColor: "text-emerald-600" },
  bearish:  { label: "Bearish",  color: "bg-red-100 text-red-800 border-red-200",             icon: TrendingDown, iconColor: "text-red-600" },
  neutral:  { label: "Neutral",  color: "bg-slate-100 text-slate-700 border-slate-200",       icon: Minus,        iconColor: "text-slate-500" },
  mixed:    { label: "Mixed",    color: "bg-amber-100 text-amber-800 border-amber-200",        icon: Activity,     iconColor: "text-amber-600" },
};

export default function SmartDigest({ newsletter, onUpdated, compact = false }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const hasBullets = newsletter.smart_digest_bullets?.length > 0;
  const sentiment = newsletter.market_sentiment;
  const sentimentCfg = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.neutral;
  const SentimentIcon = sentimentCfg.icon;

  const generate = async () => {
    setIsGenerating(true);
    try {
      await base44.functions.invoke('generateSmartDigest', { newsletter_id: newsletter.id });
      onUpdated?.();
    } finally {
      setIsGenerating(false);
    }
  };

  // Compact mode: shown on cards
  if (compact) {
    if (!hasBullets) return null;
    return (
      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-500" />
            Smart Digest
          </span>
          {sentiment && (
            <Badge className={`text-xs px-2 py-0 border flex items-center gap-1 ${sentimentCfg.color}`}>
              <SentimentIcon className={`w-3 h-3 ${sentimentCfg.iconColor}`} />
              {sentimentCfg.label}
            </Badge>
          )}
        </div>
        <ul className="space-y-1">
          {newsletter.smart_digest_bullets.slice(0, 3).map((bullet, i) => (
            <li key={i} className="text-xs text-slate-600 flex gap-1.5 leading-relaxed">
              <span className="text-blue-400 font-bold shrink-0 mt-0.5">·</span>
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Full mode: shown in detail view
  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-5 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-300" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Smart Digest</h3>
            <p className="text-slate-400 text-xs">AI-generated executive brief</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sentiment && (
            <Badge className={`text-xs px-2.5 py-1 border flex items-center gap-1.5 ${sentimentCfg.color}`}>
              <SentimentIcon className={`w-3 h-3 ${sentimentCfg.iconColor}`} />
              Deal Sentiment: {sentimentCfg.label}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={generate}
            disabled={isGenerating}
            className="text-slate-400 hover:text-white hover:bg-slate-700 h-7 w-7 p-0"
            title="Regenerate"
          >
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {isGenerating && !hasBullets ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Generating executive brief...</span>
        </div>
      ) : hasBullets ? (
        <ul className="space-y-2.5">
          {newsletter.smart_digest_bullets.map((bullet, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-200 leading-relaxed">
              <span className="text-blue-400 font-bold shrink-0 mt-0.5">{i + 1}.</span>
              {bullet}
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <p className="text-slate-400 text-sm">No digest generated yet for this newsletter.</p>
          <Button
            onClick={generate}
            disabled={isGenerating}
            size="sm"
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
            Generate Smart Digest
          </Button>
        </div>
      )}
    </div>
  );
}