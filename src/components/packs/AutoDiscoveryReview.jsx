import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AutoDiscoveryReview({ pack, newsletters }) {
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);

  const autoDiscoveredNewsletters = newsletters.filter(n => 
    pack.auto_discovered_ids?.includes(n.id)
  );

  const scanForNewContent = async () => {
    setScanning(true);
    try {
      const keywords = (pack.keywords || "").toLowerCase().split(/\s+/).filter(Boolean);
      const topics = (pack.topics_selected || []).map(t => t.toLowerCase());
      const currentPinned = pack.pinned_newsletter_ids || [];
      const currentDiscovered = pack.auto_discovered_ids || [];

      const matches = newsletters.filter(newsletter => {
        // Skip already pinned or discovered
        if (currentPinned.includes(newsletter.id) || currentDiscovered.includes(newsletter.id)) {
          return false;
        }

        const searchableContent = [
          newsletter.title || '',
          newsletter.summary || '',
          newsletter.tldr || '',
          ...(newsletter.key_takeaways || []),
          ...(newsletter.themes?.map(t => t.theme) || [])
        ].join(' ').toLowerCase();

        // Match keywords
        const keywordMatch = keywords.some(kw => searchableContent.includes(kw));
        
        // Match topics
        const topicMatch = topics.some(topic => 
          newsletter.themes?.some(t => t.theme?.toLowerCase().includes(topic))
        );

        return keywordMatch || topicMatch;
      });

      await base44.entities.LearningPack.update(pack.id, {
        auto_discovered_ids: [...currentDiscovered, ...matches.map(n => n.id)],
        last_auto_scan_date: new Date().toISOString()
      });

      toast.success(`Discovered ${matches.length} new articles for review`);
      queryClient.invalidateQueries({ queryKey: ['learningPacks'] });
    } catch (error) {
      toast.error("Scan failed: " + error.message);
    } finally {
      setScanning(false);
    }
  };

  const approveMutation = useMutation({
    mutationFn: async (newsletterId) => {
      const currentPinned = pack.pinned_newsletter_ids || [];
      const currentDiscovered = pack.auto_discovered_ids || [];
      
      await base44.entities.LearningPack.update(pack.id, {
        pinned_newsletter_ids: [...currentPinned, newsletterId],
        auto_discovered_ids: currentDiscovered.filter(id => id !== newsletterId)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learningPacks'] });
      toast.success("Added to pack");
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (newsletterId) => {
      const currentDiscovered = pack.auto_discovered_ids || [];
      await base44.entities.LearningPack.update(pack.id, {
        auto_discovered_ids: currentDiscovered.filter(id => id !== newsletterId)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learningPacks'] });
      toast.success("Removed from suggestions");
    }
  });

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            Auto-Discovered Content
          </CardTitle>
          <Button variant="outline" size="sm" onClick={scanForNewContent} disabled={scanning}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {scanning ? "Scanning..." : "Scan Now"}
          </Button>
        </div>
        {pack.last_auto_scan_date && (
          <p className="text-xs text-slate-500">
            Last scan: {format(new Date(pack.last_auto_scan_date), "MMM d, yyyy h:mm a")}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {autoDiscoveredNewsletters.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-4">
            No new articles pending review. Click "Scan Now" to discover matching content.
          </p>
        ) : (
          <div className="space-y-3">
            {autoDiscoveredNewsletters.map(newsletter => (
              <div key={newsletter.id} className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm text-slate-900 flex-1">{newsletter.title}</h4>
                  <Badge variant="outline" className="text-xs ml-2">{newsletter.source_name}</Badge>
                </div>
                <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                  {newsletter.tldr || newsletter.summary}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => approveMutation.mutate(newsletter.id)}
                    disabled={approveMutation.isPending}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectMutation.mutate(newsletter.id)}
                    disabled={rejectMutation.isPending}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}