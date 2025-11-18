import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
        ArrowLeft, 
        ExternalLink, 
        Calendar, 
        TrendingUp, 
        Lightbulb,
        Briefcase,
        DollarSign,
        Building2,
        BarChart3,
        CheckSquare
      } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewsletterDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const newsletterId = urlParams.get('id');

  const { data: newsletter, isLoading } = useQuery({
    queryKey: ['newsletter', newsletterId],
    queryFn: async () => {
      const newsletters = await base44.entities.Newsletter.filter({ id: newsletterId });
      return newsletters[0];
    },
    enabled: !!newsletterId,
  });

  const sentimentColors = {
    positive: "bg-green-100 text-green-800 border-green-200",
    neutral: "bg-slate-100 text-slate-800 border-slate-200",
    negative: "bg-red-100 text-red-800 border-red-200",
    mixed: "bg-yellow-100 text-yellow-800 border-yellow-200"
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-10 max-w-6xl mx-auto w-full overflow-x-hidden">
        <Skeleton className="h-8 w-48 mb-8" />
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-24 w-full mb-8" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div className="p-10 text-center">
        <p className="text-slate-500">Newsletter not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => navigate(createPageUrl("Dashboard"))}
        className="mb-6 hover:bg-slate-100"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/60 p-8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 mb-3">{newsletter.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {newsletter.publication_date && !isNaN(new Date(newsletter.publication_date).getTime()) 
                  ? format(new Date(newsletter.publication_date), "MMM d, yyyy") 
                  : newsletter.created_date && !isNaN(new Date(newsletter.created_date).getTime())
                  ? format(new Date(newsletter.created_date), "MMM d, yyyy")
                  : "Date not available"}
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
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>

        {newsletter.tldr && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mt-6">
            <h3 className="font-bold text-slate-900 mb-2 text-sm uppercase tracking-wide">TL;DR</h3>
            <p className="text-slate-800 font-medium leading-relaxed">{newsletter.tldr}</p>
          </div>
        )}

        {newsletter.summary && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mt-4">
            <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              Executive Summary
            </h3>
            <p className="text-slate-700 leading-relaxed">{newsletter.summary}</p>
          </div>
        )}
      </div>

      {newsletter.key_statistics && newsletter.key_statistics.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 mb-6">
          <CardHeader className="border-b border-slate-200/60">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Key Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              {newsletter.key_statistics.map((stat, index) => (
                <div key={index} className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                  <div className="text-2xl font-bold text-indigo-900 mb-1">{stat.figure}</div>
                  <p className="text-sm text-slate-700">{stat.context}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {newsletter.recommended_actions && newsletter.recommended_actions.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 mb-6">
          <CardHeader className="border-b border-slate-200/60">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-amber-600" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {newsletter.recommended_actions.map((action, index) => (
                <li key={index} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <span className="text-slate-700 flex-1">{action}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {newsletter.key_takeaways && newsletter.key_takeaways.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
            <CardHeader className="border-b border-slate-200/60">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Key Takeaways
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {newsletter.key_takeaways.map((takeaway, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="text-blue-600 font-bold mt-1">•</span>
                    <span className="text-slate-700">{takeaway}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {newsletter.themes && newsletter.themes.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
            <CardHeader className="border-b border-slate-200/60">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-purple-600" />
                Major Themes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {newsletter.themes.map((theme, index) => (
                  <div key={index} className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-semibold text-slate-900 mb-1">{theme.theme}</h4>
                    <p className="text-sm text-slate-600">{theme.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {newsletter.ma_activities && newsletter.ma_activities.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 mb-6">
          <CardHeader className="border-b border-slate-200/60">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-green-600" />
              M&A Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {newsletter.ma_activities.map((deal, index) => (
                <div key={index} className="bg-green-50 rounded-xl p-5 border border-green-100">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {deal.acquirer} → {deal.target}
                      </p>
                      {deal.deal_value && (
                        <p className="text-green-700 font-medium mt-1">{deal.deal_value}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-700 text-sm mt-2">{deal.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {newsletter.funding_rounds && newsletter.funding_rounds.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 mb-6">
          <CardHeader className="border-b border-slate-200/60">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Funding Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {newsletter.funding_rounds.map((funding, index) => (
                <div key={index} className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">{funding.company}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {funding.amount && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            {funding.amount}
                          </Badge>
                        )}
                        {funding.round_type && (
                          <Badge variant="outline">{funding.round_type}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-700 text-sm mt-2">{funding.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {newsletter.key_players && newsletter.key_players.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
          <CardHeader className="border-b border-slate-200/60">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-600" />
              Key Players
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {newsletter.key_players.map((player, index) => (
                <Badge key={index} variant="outline" className="text-sm py-2 px-4">
                  {player}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}