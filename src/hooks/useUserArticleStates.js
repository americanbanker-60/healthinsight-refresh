import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Per-user article state (starred / archived / notes) lives in the
// UserArticleState entity, scoped to the current user via RLS.
// This hook loads the user's states once and exposes a Map keyed by
// newsletter_id plus upsert helpers that "update if exists, else create".

const QUERY_KEY = ["user-article-states"];

export function useUserArticleStates() {
  const queryClient = useQueryClient();

  const { data: states = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      try {
        return await base44.entities.UserArticleState.filter({});
      } catch (_) {
        return [];
      }
    },
    staleTime: 0,
  });

  const map = useMemo(() => {
    const m = new Map();
    for (const s of states) {
      if (s.newsletter_id) m.set(s.newsletter_id, s);
    }
    return m;
  }, [states]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const upsertState = async (newsletterId, patch) => {
    const existing = map.get(newsletterId);
    if (existing?.id) {
      await base44.entities.UserArticleState.update(existing.id, patch);
    } else {
      await base44.entities.UserArticleState.create({ newsletter_id: newsletterId, ...patch });
    }
    invalidate();
  };

  const bulkUpsert = async (newsletterIds, patch) => {
    await Promise.all(newsletterIds.map(async (nid) => {
      const existing = map.get(nid);
      if (existing?.id) {
        await base44.entities.UserArticleState.update(existing.id, patch);
      } else {
        await base44.entities.UserArticleState.create({ newsletter_id: nid, ...patch });
      }
    }));
    invalidate();
  };

  return { map, isLoading, invalidate, upsertState, bulkUpsert };
}