import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { subDays, startOfYear } from "date-fns";

/**
 * Central React hook for healthcare intelligence data retrieval
 * Encapsulates server-side filtering, persistent filters state, and React Query lifecycle
 * Single source of truth for Dashboard, Knowledge Hub, and Various Sources pages
 */
export function useHealthcareIntelligence(options = {}) {
  const {
    activeTab = "all",
    maxItems = 50,
    enableInvestmentFocus = false,
  } = options;

  const { user } = useAuth();

  const [persistentFilters, setPersistentFilters] = React.useState({});
  const [skip, setSkip] = React.useState(0);

  // Fetch newsletters with server-side filtering
  const [allLoadedNewsletters, setAllLoadedNewsletters] = React.useState([]);
  
  const { data: newsletters = [], isLoading: isLoadingNewsletters, isFetching } = useQuery({
    queryKey: ['newsletters', persistentFilters, activeTab, skip],
    refetchOnWindowFocus: true,
    staleTime: 0,
    queryFn: async () => {
      const query = { is_analyzed: true };
      
      // Source filter (from tab or persistent filters)
      if (activeTab !== "all") {
        query.source_name = activeTab;
      } else if (persistentFilters?.sources && persistentFilters.sources.length > 0) {
        query.source_name = { $in: persistentFilters.sources };
      }
      
      // Date range filter
      if (persistentFilters?.startDate || persistentFilters?.endDate) {
        query.publication_date = {};
        if (persistentFilters.startDate) {
          query.publication_date.$gte = persistentFilters.startDate;
        }
        if (persistentFilters.endDate) {
          query.publication_date.$lte = persistentFilters.endDate;
        }
      }
      
      // 1. Primary: backend function (asServiceRole sees all users' articles)
      try {
        const response = await base44.functions.invoke('listNewsletters', { query, sort: '-publication_date', limit: maxItems });
        const data = response?.data ?? response;
        const newsletters = data?.newsletters || [];
        if (newsletters.length > 0) return newsletters;
      } catch (_) {}

      // 2. Fallback: user-client direct query (user's own articles)
      try {
        const fallbackQuery = { is_analyzed: true };
        if (query.source_name) fallbackQuery.source_name = query.source_name;
        const articles = await base44.entities.NewsletterItem.filter(fallbackQuery, '-publication_date', maxItems);
        if (articles.length > 0) return articles;
      } catch (_) {}

      // 3. Final fallback: localStorage bridge (articles pending DB sync)
      try {
        const localKey = user?.email ? `hi_analyzed_${user.email}` : null;
        if (localKey) {
          const local = JSON.parse(localStorage.getItem(localKey) || '[]');
          const analyzed = local.filter(n => !!n.is_analyzed || n.status === 'completed');
          if (analyzed.length > 0) return analyzed;
        }
      } catch (_) {}

      return [];
    },
    initialData: [],
  });

  // Accumulate newsletters when skip changes
  React.useEffect(() => {
    if (skip === 0) {
      setAllLoadedNewsletters(newsletters);
    } else if (newsletters.length > 0) {
      setAllLoadedNewsletters(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const newNewsletters = newsletters.filter(n => !existingIds.has(n.id));
        return [...prev, ...newNewsletters];
      });
    }
  }, [newsletters, skip]);

  // Reset skip when filters change
  React.useEffect(() => {
    setSkip(0);
    setAllLoadedNewsletters([]);
  }, [persistentFilters, activeTab]);

  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: () => base44.entities.Source.list("name"),
    initialData: [],
  });

  const { data: userConfig = {} } = useQuery({
    queryKey: ['dashboardUserConfig'],
    queryFn: () => user?.dashboard_config || {},
    initialData: {},
    enabled: enableInvestmentFocus && !!user,
  });

  // Investment focus filtering (optional)
  const focusFilteredNewsletters = React.useMemo(() => {
    const newslettersToFilter = skip > 0 ? allLoadedNewsletters : newsletters;
    
    if (!enableInvestmentFocus || !userConfig?.investment_focus || userConfig.investment_focus.length === 0) {
      return newslettersToFilter;
    }

    return newsletters.map(newsletter => {
      let relevanceScore = 0;
      const matchedFocusAreas = [];

      userConfig.investment_focus.forEach(focus => {
        const focusLower = focus.toLowerCase();
        
        if (newsletter.title?.toLowerCase().includes(focusLower)) relevanceScore += 3;
        if (newsletter.summary?.toLowerCase().includes(focusLower)) relevanceScore += 2;
        if (newsletter.key_takeaways?.some(t => t.toLowerCase().includes(focusLower))) relevanceScore += 2;
        if (newsletter.themes?.some(t => 
          t.theme?.toLowerCase().includes(focusLower) || 
          t.description?.toLowerCase().includes(focusLower)
        )) {
          relevanceScore += 2;
          matchedFocusAreas.push(focus);
        }
      });

      return { ...newsletter, relevanceScore, matchedFocusAreas };
    }).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }, [newsletters, allLoadedNewsletters, skip, userConfig, enableInvestmentFocus]);

  // Client-side filtering for fields not supported by server-side query
  const filteredNewsletters = React.useMemo(() => {
    if (!persistentFilters || Object.keys(persistentFilters).length === 0) return focusFilteredNewsletters;
    
    let filtered = focusFilteredNewsletters;
    
    // Keywords filter
    if (persistentFilters.keywords?.trim()) {
      const keywords = persistentFilters.keywords.toLowerCase().split(/\s+/).filter(k => k.length > 0);
      filtered = filtered.filter(n => {
        const searchText = [
          n.title || '',
          n.summary || '',
          n.tldr || '',
          ...(n.key_takeaways || []),
          ...(n.themes?.map(t => `${t.theme} ${t.description}`) || [])
        ].join(' ').toLowerCase();
        
        return keywords.some(keyword => searchText.includes(keyword));
      });
    }
    
    // Sentiments filter
    if (persistentFilters.sentiments && persistentFilters.sentiments.length > 0) {
      filtered = filtered.filter(n => 
        persistentFilters.sentiments.includes(n.sentiment)
      );
    }
    
    // Themes filter
    if (persistentFilters.themes && persistentFilters.themes.length > 0) {
      filtered = filtered.filter(n => 
        n.themes?.some(t => persistentFilters.themes.includes(t.theme))
      );
    }
    
    // Companies filter
    if (persistentFilters.companies && persistentFilters.companies.length > 0) {
      filtered = filtered.filter(n =>
        n.key_players?.some(p => persistentFilters.companies.includes(p))
      );
    }
    
    return filtered;
  }, [focusFilteredNewsletters, persistentFilters]);

  // Extract available filter options
  const availableThemes = React.useMemo(() => {
    const themes = new Set();
    const newslettersToUse = skip > 0 ? allLoadedNewsletters : newsletters;
    newslettersToUse.forEach(n => {
      if (n.themes) {
        n.themes.forEach(t => themes.add(t.theme));
      }
    });
    return Array.from(themes).sort();
  }, [newsletters, allLoadedNewsletters, skip]);

  const availableCompanies = React.useMemo(() => {
    const companies = new Set();
    const newslettersToUse = skip > 0 ? allLoadedNewsletters : newsletters;
    newslettersToUse.forEach(n => {
      if (n.key_players) {
        n.key_players.forEach(p => companies.add(p));
      }
    });
    return Array.from(companies).sort();
  }, [newsletters, allLoadedNewsletters, skip]);

  const availableSources = React.useMemo(() => {
    const sourceNames = new Set();
    sources.forEach(s => {
      if (!s.is_deleted && s.name) {
        sourceNames.add(s.name);
      }
    });
    return Array.from(sourceNames).sort();
  }, [sources]);

  const hasMore = newsletters.length === maxItems;
  const loadMore = () => {
    setSkip(prev => prev + maxItems);
  };

  return {
    // Data
    newsletters: filteredNewsletters,
    allNewsletters: skip > 0 ? allLoadedNewsletters : newsletters,
    sources,
    userConfig,
    
    // Loading states
    isLoading: isLoadingNewsletters,
    isLoadingMore: skip > 0 && isFetching,
    
    // Pagination
    hasMore,
    loadMore,
    
    // Filter state and management
    persistentFilters,
    setPersistentFilters,
    
    // Available filter options
    availableThemes,
    availableCompanies,
    availableSources,
  };
}

// Standalone function for non-hook contexts (backend functions, one-off queries)
export async function retrieveNewslettersForSearch(filters) {
  const query = { is_analyzed: true };
  
  if (filters.startDate || filters.endDate) {
    query.publication_date = {};
    if (filters.startDate) {
      query.publication_date.$gte = filters.startDate;
    }
    if (filters.endDate) {
      query.publication_date.$lte = filters.endDate;
    }
  }
  
  if (filters.sources && filters.sources.length > 0) {
    query.source_name = { $in: filters.sources };
  }
  
  const maxItems = filters.maxItems || 100;
  const newsletters = await base44.entities.NewsletterItem.filter(query, "-publication_date", maxItems);
  
  if (filters.keywords) {
    const keywords = filters.keywords.toLowerCase().split(/\s+/).filter(k => k.length > 0);
    return newsletters.filter(n => {
      const searchText = [
        n.title || '',
        n.summary || '',
        n.tldr || '',
        ...(n.key_takeaways || []),
        ...(n.themes?.map(t => `${t.theme} ${t.description}`) || [])
      ].join(' ').toLowerCase();
      
      return keywords.some(keyword => searchText.includes(keyword));
    });
  }
  
  return newsletters;
}