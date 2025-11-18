import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ExternalLink, ChevronRight, TrendingUp, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const sentimentColors = {
  positive: "bg-green-100 text-green-800 border-green-200",
  neutral: "bg-slate-100 text-slate-800 border-slate-200",
  negative: "bg-red-100 text-red-800 border-red-200",
  mixed: "bg-yellow-100 text-yellow-800 border-yellow-200"
};

export default function NewsletterCard({ newsletter, index }) {
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
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <div className="flex items-center gap-1 shrink-0">
                  <Calendar className="w-4 h-4" />
                  <span className="whitespace-nowrap">
                    {newsletter.publication_date && !isNaN(new Date(newsletter.publication_date).getTime())
                      ? format(new Date(newsletter.publication_date), "MMM d, yyyy")
                      : newsletter.created_date && !isNaN(new Date(newsletter.created_date).getTime())
                      ? format(new Date(newsletter.created_date), "MMM d, yyyy")
                      : "Date not available"}
                  </span>
                </div>
                {newsletter.sentiment && (
                  <Badge className={`${sentimentColors[newsletter.sentiment]} border font-medium`}>
                    {newsletter.sentiment}
                  </Badge>
                )}
              </div>
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

          <Link to={createPageUrl("NewsletterDetail") + "?id=" + newsletter.id}>
            <Button variant="ghost" className="w-full justify-between group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
              View Full Analysis
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}