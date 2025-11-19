import { format } from "date-fns";

/**
 * Content preprocessing and normalization for AI inputs
 * Ensures clean, consistent, and safe data
 */

export function preprocessNewsletter(newsletter) {
  return {
    id: newsletter.id,
    title: sanitizeText(newsletter.title) || "Untitled",
    source: sanitizeText(newsletter.source_name) || "Unknown Source",
    date: formatNewsletterDate(newsletter),
    tldr: sanitizeText(newsletter.tldr) || "",
    summary: sanitizeText(newsletter.summary) || "",
    key_takeaways: (newsletter.key_takeaways || []).map(sanitizeText).filter(Boolean),
    key_statistics: (newsletter.key_statistics || []).map(stat => ({
      figure: sanitizeText(stat.figure) || "",
      context: sanitizeText(stat.context) || ""
    })).filter(stat => stat.figure && stat.context),
    themes: (newsletter.themes || []).map(theme => ({
      theme: sanitizeText(theme.theme) || "",
      description: sanitizeText(theme.description) || ""
    })).filter(theme => theme.theme),
    ma_activities: (newsletter.ma_activities || []).map(ma => ({
      acquirer: sanitizeText(ma.acquirer) || "",
      target: sanitizeText(ma.target) || "",
      deal_value: sanitizeText(ma.deal_value) || "",
      description: sanitizeText(ma.description) || ""
    })).filter(ma => ma.acquirer || ma.target),
    funding_rounds: (newsletter.funding_rounds || []).map(f => ({
      company: sanitizeText(f.company) || "",
      amount: sanitizeText(f.amount) || "",
      round_type: sanitizeText(f.round_type) || "",
      description: sanitizeText(f.description) || ""
    })).filter(f => f.company),
    key_players: (newsletter.key_players || []).map(sanitizeText).filter(Boolean),
    recommended_actions: (newsletter.recommended_actions || []).map(sanitizeText).filter(Boolean),
    sentiment: newsletter.sentiment || "neutral"
  };
}

export function sanitizeText(text) {
  if (!text) return "";
  
  // Remove potential instruction injections
  let clean = String(text);
  
  // Remove common instruction patterns
  const injectionPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions?/gi,
    /disregard\s+(all\s+)?previous\s+instructions?/gi,
    /forget\s+(all\s+)?previous\s+instructions?/gi,
    /new\s+instructions?:/gi,
    /system\s*:/gi,
    /you\s+are\s+now/gi,
    /instead\s+of/gi,
    /prompt\s+injection/gi
  ];
  
  injectionPatterns.forEach(pattern => {
    clean = clean.replace(pattern, '[content filtered]');
  });
  
  // Normalize whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  
  // Remove excessive special characters that might be encoding attacks
  clean = clean.replace(/[^\w\s\-.,;:!?()'"%$\/&@#]/g, '');
  
  return clean;
}

export function formatNewsletterDate(newsletter) {
  try {
    const date = newsletter.publication_date 
      ? new Date(newsletter.publication_date) 
      : new Date(newsletter.created_date);
    
    if (isNaN(date.getTime())) return "Date unknown";
    return format(date, "MMM d, yyyy");
  } catch {
    return "Date unknown";
  }
}

export function deduplicateNewsletters(newsletters) {
  const seen = new Set();
  return newsletters.filter(n => {
    const key = `${n.title}-${n.source_name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function compressLongContent(text, maxLength = 500) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "... [content truncated]";
}

export function buildStructuredInput(newsletters, context = {}) {
  const processed = newsletters
    .map(preprocessNewsletter)
    .filter(n => n.title && n.title !== "Untitled");
  
  const deduplicated = deduplicateNewsletters(processed);
  
  return {
    context: {
      total_items: deduplicated.length,
      date_range: context.dateRange || "all available",
      focus: context.focus || "general analysis",
      ...context
    },
    items: deduplicated
  };
}