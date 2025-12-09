import { useMemo } from "react";
import { subDays } from "date-fns";

/**
 * Shared hook for filtering newsletters by keywords and time range
 * Used across Dashboard, ExploreAllSources, TopicPage, and CompanyPage
 */
export function useNewsletterFilters(newsletters, options = {}) {
  const {
    keywords = [],
    timeRange = null,
    searchFields = ['title', 'summary', 'tldr', 'key_takeaways', 'themes', 'key_players'],
  } = options;

  return useMemo(() => {
    if (!newsletters || !Array.isArray(newsletters)) return [];

    let filtered = newsletters;

    // Apply time range filter
    if (timeRange) {
      const cutoffDate = subDays(new Date(), timeRange);
      filtered = filtered.filter(n => {
        const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
        return pubDate >= cutoffDate;
      });
    }

    // Apply keyword filter
    if (keywords && keywords.length > 0) {
      filtered = filtered.filter(n => {
        const searchText = buildSearchText(n, searchFields).toLowerCase();
        return keywords.some(keyword => keyword && searchText.includes(keyword.toLowerCase()));
      });
    }

    return filtered;
  }, [newsletters, keywords, timeRange, searchFields]);
}

/**
 * Helper function to build searchable text from newsletter fields
 */
function buildSearchText(newsletter, fields) {
  const parts = [];

  fields.forEach(field => {
    switch (field) {
      case 'title':
        if (newsletter.title) parts.push(newsletter.title);
        break;
      case 'summary':
        if (newsletter.summary) parts.push(newsletter.summary);
        break;
      case 'tldr':
        if (newsletter.tldr) parts.push(newsletter.tldr);
        break;
      case 'key_takeaways':
        if (newsletter.key_takeaways) parts.push(...newsletter.key_takeaways);
        break;
      case 'themes':
        if (newsletter.themes) {
          newsletter.themes.forEach(t => {
            if (t.theme) parts.push(t.theme);
            if (t.description) parts.push(t.description);
          });
        }
        break;
      case 'key_players':
        if (newsletter.key_players) parts.push(...newsletter.key_players);
        break;
      case 'ma_activities':
        if (newsletter.ma_activities) {
          newsletter.ma_activities.forEach(ma => {
            if (ma.acquirer) parts.push(ma.acquirer);
            if (ma.target) parts.push(ma.target);
          });
        }
        break;
      case 'funding_rounds':
        if (newsletter.funding_rounds) {
          newsletter.funding_rounds.forEach(f => {
            if (f.company) parts.push(f.company);
          });
        }
        break;
    }
  });

  return parts.join(' ');
}