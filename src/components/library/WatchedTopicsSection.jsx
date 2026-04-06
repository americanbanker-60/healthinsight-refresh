import React from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Eye, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, subDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function WatchedTopicsSection() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: watchedTopics = [], isLoading } = useQuery({
    queryKey: ['watchedTopics'],
    queryFn: async () => {
      return await base44.entities.WatchedTopic.filter({ created_by: user.email }, "-created_date");
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list(),
    initialData: [],
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['topicAlerts'],
    queryFn: async () => {
      return await base44.entities.TopicAlert.filter({ created_by: user.email }, "-created_date");
    },
    initialData: [],
    enabled: !!user,
  });

  const { data: newsletters = [] } = useQuery({
    queryKey: ['newsletters', 'watched-topics'],
    queryFn: () => base44.entities.NewsletterItem.list("-publication_date", 100),
    initialData: [],
  });

  const watchedTopicsWithDetails = watchedTopics.map(wt => {
    const topic = topics.find(t => t.id === wt.topic_id);
    if (!topic) return null;

    const topicAlerts = alerts.filter(a => a.topic_id === wt.topic_id);
    const unreadCount = topicAlerts.filter(a => !a.is_read).length;
    
    // Get recent items matching this topic (last 7 days)
    const cutoffDate = subDays(new Date(), 7);
    const recentItems = newsletters.filter(n => {
      const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
      if (pubDate < cutoffDate) return false;
      
      const searchText = [
        n.title,
        n.summary,
        n.tldr,
        ...(n.themes?.map(t => t.theme) || [])
      ].join(' ').toLowerCase();
      
      return topic.keywords?.some(keyword => searchText.includes(keyword.toLowerCase()));
    }).slice(0, 3);

    return {
      ...wt,
      topic,
      unreadCount,
      recentItems
    };
  }).filter(Boolean);

  const openTopic = (topicId) => {
    navigate(createPageUrl("TopicPage") + "?id=" + topicId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Watched Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array(2).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (watchedTopicsWithDetails.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Watched Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-600 mb-3">You're not watching any topics yet.</p>
            <div className="text-xs text-slate-500 space-y-1 max-w-sm mx-auto text-left">
              <p>• Browse topics from the Topics Directory</p>
              <p>• Click the "Watch" button on any topic page</p>
              <p>• Get alerts when new content matches your watched topics</p>
              <p>• Manage notification frequency in User Settings</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          Watched Topics
          {watchedTopicsWithDetails.some(wt => wt.unreadCount > 0) && (
            <Badge variant="destructive" className="ml-2">
              {watchedTopicsWithDetails.reduce((sum, wt) => sum + wt.unreadCount, 0)} new
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {watchedTopicsWithDetails.map(wt => (
            <Card key={wt.id} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {wt.topic.icon && <span className="text-xl">{wt.topic.icon}</span>}
                      <h4 className="font-semibold text-slate-900">{wt.topic.topic_name}</h4>
                      {wt.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {wt.unreadCount} new
                        </Badge>
                      )}
                    </div>
                    
                    {wt.recentItems.length > 0 ? (
                      <div className="space-y-1">
                        {wt.recentItems.map(item => {
                          const pubDate = item.publication_date 
                            ? new Date(item.publication_date) 
                            : new Date(item.created_date);
                          
                          return (
                            <div key={item.id} className="text-xs text-slate-600 flex items-center gap-2">
                              <span className="text-slate-400">•</span>
                              <span className="flex-1 truncate">{item.title}</span>
                              <span className="text-slate-400">{format(pubDate, "MMM d")}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No recent activity</p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openTopic(wt.topic.id)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}