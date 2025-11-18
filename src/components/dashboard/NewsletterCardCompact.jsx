import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronRight, TrendingUp, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const sentimentColors = {
  positive: "bg-green-100 text-green-800 border-green-200",
  neutral: "bg-slate-100 text-slate-800 border-slate-200",
  negative: "bg-red-100 text-red-800 border-red-200",
  mixed: "bg-yellow-100 text-yellow-800 border-yellow-200"
};

export default function NewsletterCardCompact({ newsletter, index }) {
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
            {newsletter.sentiment && (
              <Badge className={`${sentimentColors[newsletter.sentiment]} border text-xs`}>
                {newsletter.sentiment}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {newsletter.publication_date 
                ? format(new Date(newsletter.publication_date), "MMM d, yyyy")
                : format(new Date(newsletter.created_date), "MMM d, yyyy")}
            </div>
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