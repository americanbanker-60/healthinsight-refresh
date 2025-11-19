import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ExternalLink, Calendar, TrendingUp, Briefcase, DollarSign } from "lucide-react";
import { format } from "date-fns";

const sentimentColors = {
  positive: "bg-green-100 text-green-800 border-green-200",
  neutral: "bg-slate-100 text-slate-800 border-slate-200",
  negative: "bg-red-100 text-red-800 border-red-200",
  mixed: "bg-yellow-100 text-yellow-800 border-yellow-200"
};

export default function NewsletterDetailModal({ newsletter, onClose }) {
  const pubDate = newsletter.publication_date 
    ? new Date(newsletter.publication_date) 
    : new Date(newsletter.created_date);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-3">{newsletter.title}</DialogTitle>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Badge variant="outline">{newsletter.source_name}</Badge>
                <div className="flex items-center gap-1 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  {format(pubDate, "MMMM d, yyyy")}
                </div>
                {newsletter.sentiment && (
                  <Badge className={sentimentColors[newsletter.sentiment]}>
                    {newsletter.sentiment}
                  </Badge>
                )}
                {newsletter.source_url && (
                  <a
                    href={newsletter.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Source
                  </a>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {newsletter.tldr && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">TL;DR</h3>
              <p className="text-slate-700">{newsletter.tldr}</p>
            </div>
          )}

          {newsletter.summary && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Executive Summary</h3>
              <p className="text-slate-700 leading-relaxed">{newsletter.summary}</p>
            </div>
          )}

          {newsletter.key_takeaways && newsletter.key_takeaways.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Key Takeaways
              </h3>
              <ul className="space-y-2">
                {newsletter.key_takeaways.map((takeaway, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-blue-600 font-semibold">•</span>
                    <span className="text-slate-700">{takeaway}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {newsletter.key_statistics && newsletter.key_statistics.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold text-slate-900 mb-3">Key Statistics</h3>
              <div className="space-y-3">
                {newsletter.key_statistics.map((stat, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded font-semibold text-sm">
                      {stat.figure}
                    </div>
                    <p className="text-slate-700 text-sm flex-1">{stat.context}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {newsletter.themes && newsletter.themes.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold text-slate-900 mb-3">Major Themes</h3>
              <div className="space-y-3">
                {newsletter.themes.map((theme, idx) => (
                  <div key={idx}>
                    <h4 className="font-medium text-slate-800">{theme.theme}</h4>
                    <p className="text-slate-600 text-sm mt-1">{theme.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {newsletter.ma_activities && newsletter.ma_activities.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-green-600" />
                M&A Activity
              </h3>
              <div className="space-y-3">
                {newsletter.ma_activities.map((ma, idx) => (
                  <div key={idx} className="border-l-2 border-green-200 pl-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-800">{ma.acquirer}</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-medium text-slate-800">{ma.target}</span>
                      {ma.deal_value && (
                        <Badge className="bg-green-100 text-green-700">{ma.deal_value}</Badge>
                      )}
                    </div>
                    <p className="text-slate-600 text-sm">{ma.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {newsletter.funding_rounds && newsletter.funding_rounds.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                Funding Rounds
              </h3>
              <div className="space-y-3">
                {newsletter.funding_rounds.map((funding, idx) => (
                  <div key={idx} className="border-l-2 border-purple-200 pl-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-800">{funding.company}</span>
                      {funding.amount && (
                        <Badge className="bg-purple-100 text-purple-700">{funding.amount}</Badge>
                      )}
                      {funding.round_type && (
                        <Badge variant="outline" className="text-xs">{funding.round_type}</Badge>
                      )}
                    </div>
                    <p className="text-slate-600 text-sm">{funding.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {newsletter.recommended_actions && newsletter.recommended_actions.length > 0 && (
            <Card className="p-4 bg-amber-50 border-amber-200">
              <h3 className="font-semibold text-amber-900 mb-3">Recommended Actions</h3>
              <ul className="space-y-2">
                {newsletter.recommended_actions.map((action, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-amber-600 font-semibold">→</span>
                    <span className="text-slate-700">{action}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}