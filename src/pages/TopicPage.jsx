import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, TrendingUp, BookOpen, Calendar, Eye, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { format, subDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import TopicQuickSummary from "../components/topics/TopicQuickSummary";
import TopicTimeline from "../components/topics/TopicTimeline";
import NewsletterDetailModal from "../components/explore/NewsletterDetailModal";
import WatchTopicButton from "../components/topics/WatchTopicButton";
import BackButton from "../components/navigation/BackButton";

export default function TopicPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get('id');
  
  const [timeRange, setTimeRange] = useState(90);
  const [showAllNews, setShowAllNews] = useState(false);
  const [detailNewsletterId, setDetailNewsletterId] = useState(null);

  const { data: topic, isLoading: topicLoading } = useQuery({
    queryKey: ['topic', topicId],
    queryFn: async () => {
      const topics = await base44.entities.Topic.list();
      return topics.find(t => t.id === topicId);
    },
    enabled: !!topicId,
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

  // Filter newsletters that match topic keywords
  const relevantNewsletters = useMemo(() => {
    if (!topic || !topic.keywords) return [];
    
    const keywords = Array.isArray(topic.keywords) ? topic.keywords : [topic.keywords];
    const cutoffDate = subDays(new Date(), timeRange);
    
    return newsletters.filter(n => {
      const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
      if (pubDate < cutoffDate) return false;
      
      const searchText = [
        n.title,
        n.summary,
        n.tldr,
        ...(n.key_takeaways || []),
        ...(n.themes?.map(t => t.theme) || []),
        ...(n.themes?.map(t => t.description) || [])
      ].join(' ').toLowerCase();
      
      return keywords.some(keyword => keyword && searchText.includes(keyword.toLowerCase()));
    });
  }, [topic, newsletters, timeRange]);

  // Get related Learning Packs
  const relatedPacks = useMemo(() => {
    if (!topic || !topic.related_pack_ids) return [];
    return learningPacks.filter(pack => topic.related_pack_ids.includes(pack.id));
  }, [topic, learningPacks]);

  // Extract related companies (companies mentioned frequently)
  const relatedCompanies = useMemo(() => {
    if (!relevantNewsletters.length) return [];
    
    const companyCount = {};
    relevantNewsletters.forEach(n => {
      if (n.key_players) {
        n.key_players.forEach(player => {
          companyCount[player] = (companyCount[player] || 0) + 1;
        });
      }
      if (n.ma_activities) {
        n.ma_activities.forEach(ma => {
          if (ma.acquirer) companyCount[ma.acquirer] = (companyCount[ma.acquirer] || 0) + 1;
          if (ma.target) companyCount[ma.target] = (companyCount[ma.target] || 0) + 1;
        });
      }
      if (n.funding_rounds) {
        n.funding_rounds.forEach(f => {
          if (f.company) companyCount[f.company] = (companyCount[f.company] || 0) + 1;
        });
      }
    });
    
    return Object.entries(companyCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([company, count]) => ({ company, count }));
  }, [relevantNewsletters]);

  const exploreInAllSources = () => {
    const keywords = Array.isArray(topic.keywords) ? topic.keywords.join(' ') : topic.keywords;
    const params = new URLSearchParams({ keywords });
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  const openPack = (pack) => {
    const params = new URLSearchParams({
      pack_id: pack.id,
      pack_title: pack.pack_title
    });
    navigate(createPageUrl("ExploreAllSources") + "?" + params.toString());
  };

  const generateDeepDive = () => {
    const params = new URLSearchParams({
      topic_id: topic.id,
      title: topic.topic_name
    });
    navigate(createPageUrl("DeepDiveResults") + "?" + params.toString());
  };

  const displayedNews = showAllNews ? relevantNewsletters : relevantNewsletters.slice(0, 10);
  const detailNewsletter = newsletters.find(n => n.id === detailNewsletterId);

  if (topicLoading) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <Skeleton className="h-12 w-2/3 mb-4" />
        <Skeleton className="h-64 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Topic Not Found</h1>
        <p className="text-slate-600">The requested topic could not be found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <BackButton className="mb-4" />
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {topic.icon && <div className="text-5xl">{topic.icon}</div>}
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{topic.topic_name}</h1>
              {topic.description && (
                <p className="text-slate-600 text-lg mt-2">{topic.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <WatchTopicButton topicId={topic.id} variant="outline" />
            <Button variant="outline" onClick={generateDeepDive} className="gap-2">
              <FileText className="w-4 h-4" />
              Generate Deep Dive
            </Button>
            <Button onClick={exploreInAllSources} className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Explore in All Sources
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Badge variant="outline">{relevantNewsletters.length} relevant items</Badge>
          {topic.keywords && (
            <div className="flex gap-1">
              {(Array.isArray(topic.keywords) ? topic.keywords : [topic.keywords]).slice(0, 5).map((keyword, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Summary */}
      <TopicQuickSummary 
        topic={topic}
        relevantNewsletters={relevantNewsletters}
      />

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <TopicTimeline 
            newsletters={relevantNewsletters}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />

          {/* Recent News */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Recent News & Updates
                </CardTitle>
                <Badge>{relevantNewsletters.length} items</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {newsLoading ? (
                <div className="space-y-3">
                  {Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : displayedNews.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No recent news found for this topic</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {displayedNews.map(newsletter => {
                      const pubDate = newsletter.publication_date 
                        ? new Date(newsletter.publication_date) 
                        : new Date(newsletter.created_date);
                      
                      return (
                        <Card key={newsletter.id} className="border-slate-200 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm mb-1">{newsletter.title}</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                  <Badge variant="outline" className="text-xs">{newsletter.source_name}</Badge>
                                  <span>{format(pubDate, "MMM d, yyyy")}</span>
                                </div>
                                {newsletter.tldr && (
                                  <p className="text-xs text-slate-600 line-clamp-2">{newsletter.tldr}</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDetailNewsletterId(newsletter.id)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  
                  {relevantNewsletters.length > 10 && (
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => setShowAllNews(!showAllNews)}
                    >
                      {showAllNews ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-2" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-2" />
                          Show All ({relevantNewsletters.length - 10} more)
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
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

          {/* Related Companies */}
          {relatedCompanies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Frequently Mentioned Companies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {relatedCompanies.map(({ company, count }) => (
                    <div key={company} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{company}</span>
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