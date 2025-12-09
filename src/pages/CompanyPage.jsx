import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, TrendingUp, BookOpen, Calendar, Eye, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { useNewsletterFilters } from "@/hooks/useNewsletterFilters";
import { Skeleton } from "@/components/ui/skeleton";
import CompanyOverview from "../components/company/CompanyOverview";
import CompanyTimeline from "../components/company/CompanyTimeline";
import NewsletterDetailModal from "../components/explore/NewsletterDetailModal";
import BackButton from "../components/navigation/BackButton";
import BDActionPrompt from "../components/bd/BDActionPrompt";

export default function CompanyPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const companyId = urlParams.get('id');
  
  const [timeRange, setTimeRange] = useState(90);
  const [detailNewsletterId, setDetailNewsletterId] = useState(null);

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      const companies = await base44.entities.Company.filter({ id: companyId });
      return companies[0];
    },
    enabled: !!companyId,
  });

  const { data: newsletters = [], isLoading: newsLoading } = useQuery({
    queryKey: ['newsletters'],
    queryFn: () => base44.entities.Newsletter.list("-publication_date", 500),
    initialData: [],
  });

  const { data: learningPacks = [] } = useQuery({
    queryKey: ['learningPacks'],
    queryFn: () => base44.entities.LearningPack.list("sort_order"),
    initialData: [],
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list("sort_order"),
    initialData: [],
  });

  // Filter newsletters that mention the company
  const allKeywords = useMemo(() => {
    if (!company) return [];
    return [
      company.company_name,
      ...(company.known_aliases || []),
      ...(company.primary_keywords || [])
    ];
  }, [company]);

  const relevantNewsletters = useNewsletterFilters(newsletters, {
    keywords: allKeywords,
    timeRange,
    searchFields: ['title', 'summary', 'tldr', 'key_takeaways', 'key_players', 'ma_activities', 'funding_rounds']
  });

  // Extract highlights (MA, funding, partnerships)
  const highlights = useMemo(() => {
    if (!relevantNewsletters.length) return { ma: [], funding: [], other: [] };
    
    const ma = [];
    const funding = [];
    const other = [];

    relevantNewsletters.forEach(n => {
      const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
      
      if (n.ma_activities) {
        n.ma_activities.forEach(activity => {
          ma.push({
            date: pubDate,
            source: n.source_name,
            ...activity,
            newsletterId: n.id
          });
        });
      }
      
      if (n.funding_rounds) {
        n.funding_rounds.forEach(round => {
          funding.push({
            date: pubDate,
            source: n.source_name,
            ...round,
            newsletterId: n.id
          });
        });
      }
    });

    return { ma, funding, other };
  }, [relevantNewsletters]);

  // Get related Learning Packs
  const relatedPacks = useMemo(() => {
    if (!company || !company.related_pack_ids) return [];
    return learningPacks.filter(pack => company.related_pack_ids.includes(pack.id));
  }, [company, learningPacks]);

  // Get related topics based on keyword overlap
  const relatedTopics = useMemo(() => {
    if (!company || !relevantNewsletters.length) return [];
    
    const topicMentions = {};
    
    relevantNewsletters.forEach(n => {
      if (n.themes) {
        n.themes.forEach(theme => {
          topicMentions[theme.theme] = (topicMentions[theme.theme] || 0) + 1;
        });
      }
    });
    
    return Object.entries(topicMentions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([themeName, count]) => {
        const topic = topics.find(t => t.topic_name === themeName);
        return { name: themeName, count, topic };
      });
  }, [relevantNewsletters, topics]);

  const exploreInAllSources = () => {
    const params = new URLSearchParams({ keywords: company.company_name });
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  const openPack = (pack) => {
    const params = new URLSearchParams({
      pack_id: pack.id,
      pack_title: pack.pack_title
    });
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  const openTopic = (topic) => {
    if (!topic) return;
    const params = new URLSearchParams({ id: topic.id });
    navigate(createPageUrl("TopicPage") + "?" + params.toString());
  };

  const detailNewsletter = newsletters.find(n => n.id === detailNewsletterId);

  if (companyLoading) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <Skeleton className="h-12 w-2/3 mb-4" />
        <Skeleton className="h-64 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Company Not Found</h1>
        <p className="text-slate-600">The requested company could not be found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <BackButton className="mb-4" />
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.company_name} className="w-16 h-16 rounded-lg object-contain bg-white p-2 border border-slate-200" />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{company.company_name}</h1>
              {company.description && (
                <p className="text-slate-600 text-lg mt-2">{company.description}</p>
              )}
            </div>
          </div>
          <Button onClick={exploreInAllSources} className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Explore in All Sources
          </Button>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Badge variant="outline">{relevantNewsletters.length} mentions</Badge>
          {company.known_aliases && company.known_aliases.length > 0 && (
            <div className="flex gap-1">
              {company.known_aliases.slice(0, 3).map((alias, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  aka {alias}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BD Action Prompt */}
      <div className="mb-6">
        <BDActionPrompt 
          type="company"
          context={`${relevantNewsletters.length} mentions of ${company.company_name} — research decision-makers, draft an intro, or track for deal signals.`}
          variant="compact"
          contextData={{
            name: company.company_name,
            description: company.description,
            companies: [company.company_name, ...(company.known_aliases || [])],
            deals: highlights.ma.length > 0 
              ? highlights.ma.slice(0, 3).map(m => `${m.acquirer} → ${m.target}`).join("; ")
              : highlights.funding.length > 0
              ? highlights.funding.slice(0, 3).map(f => `${f.company} raised ${f.amount}`).join("; ")
              : null,
            themes: relatedTopics.slice(0, 5).map(t => t.name),
            summary: `${relevantNewsletters.length} recent mentions. ${highlights.ma.length} M&A activities, ${highlights.funding.length} funding rounds.`
          }}
        />
      </div>

      {/* AI Overview */}
      <CompanyOverview 
        company={company}
        relevantNewsletters={relevantNewsletters}
      />

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <CompanyTimeline 
            newsletters={relevantNewsletters}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            onViewDetail={setDetailNewsletterId}
          />

          {/* Highlights */}
          {(highlights.ma.length > 0 || highlights.funding.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-600" />
                  Key Activity Highlights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {highlights.ma.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-slate-700 mb-2">M&A Activity</h4>
                    <div className="space-y-2">
                      {highlights.ma.slice(0, 5).map((ma, idx) => (
                        <Card key={idx} className="border-slate-200">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {ma.acquirer} → {ma.target}
                                </p>
                                {ma.deal_value && (
                                  <p className="text-xs text-slate-600">{ma.deal_value}</p>
                                )}
                                {ma.description && (
                                  <p className="text-xs text-slate-500 mt-1">{ma.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                  <Badge variant="outline" className="text-xs">{ma.source}</Badge>
                                  <span>{format(ma.date, "MMM d, yyyy")}</span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDetailNewsletterId(ma.newsletterId)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {highlights.funding.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-slate-700 mb-2">Funding Activity</h4>
                    <div className="space-y-2">
                      {highlights.funding.slice(0, 5).map((funding, idx) => (
                        <Card key={idx} className="border-slate-200">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {funding.company} - {funding.round_type}
                                </p>
                                {funding.amount && (
                                  <p className="text-xs text-slate-600">{funding.amount}</p>
                                )}
                                {funding.description && (
                                  <p className="text-xs text-slate-500 mt-1">{funding.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                  <Badge variant="outline" className="text-xs">{funding.source}</Badge>
                                  <span>{format(funding.date, "MMM d, yyyy")}</span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDetailNewsletterId(funding.newsletterId)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Related Learning Packs */}
          {relatedPacks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  Related Learning Packs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {relatedPacks.map(pack => (
                    <Card key={pack.id} className="border-slate-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => openPack(pack)}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          {pack.icon && <div className="text-2xl">{pack.icon}</div>}
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">{pack.pack_title}</h4>
                            <p className="text-xs text-slate-600 line-clamp-2">{pack.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Topics */}
          {relatedTopics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Related Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {relatedTopics.map(({ name, count, topic }) => (
                    <div 
                      key={name} 
                      className={`flex items-center justify-between text-sm ${topic ? 'cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors' : 'p-2'}`}
                      onClick={() => topic && openTopic(topic)}
                    >
                      <span className="text-slate-700">{name}</span>
                      <Badge variant="secondary" className="text-xs">{count} mentions</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {detailNewsletter && (
        <NewsletterDetailModal
          newsletter={detailNewsletter}
          onClose={() => setDetailNewsletterId(null)}
        />
      )}
    </div>
  );
}