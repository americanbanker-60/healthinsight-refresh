import { base44 } from "@/api/base44Client";
import { subDays, startOfYear } from "date-fns";

/**
 * Unified data retrieval service for all AI operations
 * Ensures comprehensive data collection before AI processing
 */

export async function retrieveNewslettersForTopic(topicId, dateRange = 180) {
  const topics = await base44.entities.Topic.list();
  const topic = topics.find(t => t.id === topicId);
  
  if (!topic) return [];
  
  const cutoffDate = subDays(new Date(), dateRange);
  
  // Server-side date filtering
  const newsletters = await base44.entities.Newsletter.filter(
    { publication_date: { $gte: cutoffDate.toISOString().split('T')[0] } },
    "-publication_date",
    500
  );
  
  // Client-side keyword matching (can't be done server-side)
  const keywords = Array.isArray(topic.keywords) ? topic.keywords : [topic.keywords];
  
  return newsletters.filter(n => {
    const searchText = [
      n.title || '',
      n.summary || '',
      n.tldr || '',
      ...(n.key_takeaways || []),
      ...(n.themes?.map(t => t.theme || '') || []),
      ...(n.themes?.map(t => t.description || '') || [])
    ].join(' ').toLowerCase();
    
    return keywords.some(keyword => keyword && searchText.includes(keyword.toLowerCase()));
  });
}

export async function retrieveNewslettersForPack(packId, maxItems = 100) {
  const packs = await base44.entities.LearningPack.list();
  const pack = packs.find(p => p.id === packId);
  
  if (!pack) return [];
  
  // Build server-side query
  const query = {};
  
  // Date range filter
  if (pack.date_range_type) {
    const today = new Date();
    let startDate;
    
    switch (pack.date_range_type) {
      case "7d": startDate = subDays(today, 7); break;
      case "30d": startDate = subDays(today, 30); break;
      case "90d": startDate = subDays(today, 90); break;
      case "ytd": startDate = startOfYear(today); break;
      case "custom":
        startDate = pack.custom_start_date ? new Date(pack.custom_start_date) : null;
        break;
    }
    
    if (startDate) {
      query.publication_date = { $gte: startDate.toISOString().split('T')[0] };
    }
  }
  
  // Source filter
  if (pack.sources_selected && pack.sources_selected.length > 0) {
    query.source_name = { $in: pack.sources_selected };
  }
  
  const newsletters = await base44.entities.Newsletter.filter(query, "-publication_date", maxItems);
  
  // Client-side keyword filter (can't be done server-side)
  if (pack.keywords) {
    const keywords = pack.keywords.split(/\s+/).filter(k => k.length > 0);
    return newsletters.filter(n => {
      const searchText = [
        n.title || '',
        n.summary || '',
        n.tldr || ''
      ].join(' ').toLowerCase();
      
      return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
    });
  }
  
  return newsletters;
}

export async function retrieveNewslettersForCompany(companyName, maxItems = 50) {
  const newsletters = await base44.entities.Newsletter.list("-publication_date", 500);
  
  return newsletters.filter(n => {
    const searchText = [
      n.title || '',
      n.summary || '',
      n.tldr || '',
      ...(n.key_players || []),
      ...(n.ma_activities?.map(ma => `${ma.acquirer} ${ma.target}`) || []),
      ...(n.funding_rounds?.map(f => f.company) || [])
    ].join(' ').toLowerCase();
    
    return searchText.includes(companyName.toLowerCase());
  }).slice(0, maxItems);
}

export async function retrieveNewslettersForSearch(filters) {
  const newsletters = await base44.entities.Newsletter.list("-publication_date", 500);
  
  let filtered = newsletters;
  
  // Date range
  if (filters.startDate) {
    filtered = filtered.filter(n => {
      const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
      return pubDate >= new Date(filters.startDate);
    });
  }
  
  if (filters.endDate) {
    filtered = filtered.filter(n => {
      const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
      return pubDate <= new Date(filters.endDate);
    });
  }
  
  // Sources
  if (filters.sources && filters.sources.length > 0) {
    filtered = filtered.filter(n => filters.sources.includes(n.source_name));
  }
  
  // Keywords
  if (filters.keywords) {
    const keywords = filters.keywords.toLowerCase().split(/\s+/).filter(k => k.length > 0);
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
  
  return filtered.slice(0, filters.maxItems || 100);
}

export async function retrieveCustomPackItems(packId) {
  const items = await base44.entities.UserCustomPackItem.filter({ custom_pack_id: packId });
  const sortedItems = items.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  
  const newsletters = await base44.entities.Newsletter.list();
  
  return sortedItems.map(item => {
    const newsletter = newsletters.find(n => n.id === item.item_id);
    return {
      newsletter,
      note: item.note,
      order: item.order_index
    };
  }).filter(item => item.newsletter);
}