import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronRight, TrendingUp, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BDInsightBadge } from "../bd/BDActionPrompt";
import NewsletterMetadata from "../newsletter/NewsletterMetadata";
import AskAIButton from "@/components/common/AskAIButton";

export default function NewsletterCard({ newsletter, index, variant = "full" }) {
  if (variant === "minimal") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
      >
        <Link to={createPageUrl("NewsletterDetail") + "?id=" + newsletter.id}>
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                {newsletter.title}
              </h4>
            </div>
            <div className="text-xs text-slate-500 shrink-0">
              {newsletter.publication_date && !isNaN(new Date(newsletter.publication_date).getTime())
                ? format(new Date(newsletter.publication_date), "MMM d")
                : "N/A"}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-200 border-slate-200/60 group">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors flex-1">
                {newsletter.title}
              </h3>
              <NewsletterMetadata newsletter={newsletter} className="text-xs" />
            </div>
            
            <NewsletterMetadata newsletter={newsletter} className="text-xs mb-2" />
            <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
              {newsletter.key_takeaways && newsletter.key_takeaways.length > 0 && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {newsletter.key_takeaways.length} insights
                </div>
              )}
              {newsletter.ma_activities && newsletter.ma_activities.length > 0 && (
                <div className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {newsletter.ma_activities.length} M&A
                </div>
              )}
            </div>

            <Link to={createPageUrl("NewsletterDetail") + "?id=" + newsletter.id}>
              <Button variant="ghost" size="sm" className="w-full justify-between group-hover:bg-blue-50 group-hover:text-blue-700 h-8 text-xs">
                View Details
                <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Full variant (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 border-slate-200/60 group">
        <CardHeader className="border-b border-slate-200/60 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2 group-hover:text-blue-600 transition-colors">
                {newsletter.title}
              </CardTitle>
              <NewsletterMetadata newsletter={newsletter} />
            </div>
            <a
              href={newsletter.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-blue-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {newsletter.tldr && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
              <p className="text-sm text-slate-700 font-medium">{newsletter.tldr}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mb-4">
            {newsletter.key_takeaways && newsletter.key_takeaways.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-slate-600">{newsletter.key_takeaways.length} takeaways</span>
              </div>
            )}
            {newsletter.ma_activities && newsletter.ma_activities.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="w-4 h-4 text-green-600" />
                <span className="text-slate-600">{newsletter.ma_activities.length} M&A deals</span>
              </div>
            )}
            {(newsletter.ma_activities?.length > 0 || newsletter.funding_rounds?.length > 0) && (
              <BDInsightBadge text="Deal Signal" />
            )}
          </div>

          {newsletter.themes && newsletter.themes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {newsletter.themes.slice(0, 3).map((theme, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {theme.theme}
                </Badge>
              ))}
              {newsletter.themes.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{newsletter.themes.length - 3} more
                </Badge>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Link to={createPageUrl("NewsletterDetail") + "?id=" + newsletter.id} className="flex-1">
              <Button variant="ghost" className="w-full justify-between group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                View Full Analysis
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <AskAIButton
              prompt={`Analyze this newsletter and give me BD angles: "${newsletter.title}" from ${newsletter.source_name}. ${newsletter.tldr || ""}`}
              label="Ask AI"
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}