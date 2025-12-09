import React from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NewsletterCardMinimal({ newsletter, index }) {
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
          <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
            <Calendar className="w-3 h-3" />
            {newsletter.publication_date && !isNaN(new Date(newsletter.publication_date).getTime())
              ? format(new Date(newsletter.publication_date), "MMM d")
              : "N/A"}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}