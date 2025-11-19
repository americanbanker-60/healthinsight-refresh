import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

export default function WatchTopicButton({ topicId, variant = "default" }) {
  const queryClient = useQueryClient();

  const { data: watchedTopics = [] } = useQuery({
    queryKey: ['watchedTopics'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.WatchedTopic.filter({ created_by: user.email });
    },
    initialData: [],
  });

  const isWatching = watchedTopics.some(wt => wt.topic_id === topicId);

  const toggleWatchMutation = useMutation({
    mutationFn: async () => {
      if (isWatching) {
        const watchRecord = watchedTopics.find(wt => wt.topic_id === topicId);
        return await base44.entities.WatchedTopic.delete(watchRecord.id);
      } else {
        return await base44.entities.WatchedTopic.create({ topic_id: topicId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchedTopics'] });
      toast.success(isWatching ? "Stopped watching topic" : "Now watching topic");
    },
  });

  return (
    <Button
      variant={variant === "outline" ? "outline" : isWatching ? "default" : "outline"}
      onClick={() => toggleWatchMutation.mutate()}
      disabled={toggleWatchMutation.isPending}
      className="gap-2"
    >
      {isWatching ? <Bell className="w-4 h-4 fill-current" /> : <BellOff className="w-4 h-4" />}
      {isWatching ? "Watching" : "Watch Topic"}
    </Button>
  );
}