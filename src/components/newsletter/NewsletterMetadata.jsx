import React from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { SentimentBadge } from "../common/CategoryBadge";

/**
 * Standardized newsletter metadata display (source, date, sentiment, link)
 */
export default function NewsletterMetadata({ 
  newsletter, 
  showLink = false, 
  className = "" 
}) {
  const pubDate = newsletter.publication_date && !isNaN(new Date(newsletter.publication_date).getTime())
    ? new Date(newsletter.publication_date)
    : new Date(newsletter.created_date);

  return (
    <div className={`flex flex-wrap items-center gap-3 text-sm ${className}`}>
      <Badge variant="outline">{newsletter.source_name}</Badge>
      <div className="flex items-center gap-1 text-slate-600">
        <Calendar className="w-4 h-4" />
        <span>{format(pubDate, "MMM d, yyyy")}</span>
      </div>
      <SentimentBadge sentiment={newsletter.sentiment} />
      {showLink && newsletter.source_url && (
        <a
          href={newsletter.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-4 h-4" />
          Source
        </a>
      )}
    </div>
  );
}