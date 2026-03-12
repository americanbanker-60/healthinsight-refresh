import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { DOMParser } from 'npm:linkedom';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { url, newsletterId } = await req.json();

    if (!url) {
      return Response.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch the page content
    let html;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HealthInsightBot/1.0)'
        }
      });
      
      if (!response.ok) {
        return Response.json({ 
          success: false,
          error: `Failed to fetch URL: ${response.status}`,
          confidence: 'unknown'
        });
      }
      
      html = await response.text();
    } catch (fetchError) {
      return Response.json({ 
        success: false,
        error: `Network error: ${fetchError.message}`,
        confidence: 'unknown'
      });
    }

    // Parse HTML
    const { document } = new DOMParser().parseFromString(html, 'text/html');
    
    const result = extractPublicationDate(document, url);

    // If newsletterId provided, update the newsletter
    if (newsletterId && result.success) {
      await base44.asServiceRole.entities.NewsletterItem.update(newsletterId, {
        publication_date: result.date,
        publication_date_confidence: result.confidence,
        publication_date_source: result.source,
        publication_date_notes: result.notes
      });
    }

    return Response.json(result);

  } catch (error) {
    console.error('Publication date extraction error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});

function extractPublicationDate(document, url) {
  const results = [];
  
  // Strategy 1: Meta tags (highest priority)
  const metaSelectors = [
    'meta[property="article:published_time"]',
    'meta[name="article:published_time"]',
    'meta[property="article:published"]',
    'meta[name="pubdate"]',
    'meta[name="date"]',
    'meta[name="publishdate"]',
    'meta[property="og:published_time"]',
    'meta[name="DC.date"]',
    'meta[name="publication_date"]'
  ];
  
  for (const selector of metaSelectors) {
    const meta = document.querySelector(selector);
    if (meta) {
      const content = meta.getAttribute('content');
      if (content) {
        const parsed = parseDate(content);
        if (parsed) {
          results.push({
            date: parsed,
            source: `meta tag: ${selector}`,
            confidence: 'high',
            priority: 1
          });
        }
      }
    }
  }

  // Strategy 2: JSON-LD structured data
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent);
      const datePublished = data.datePublished || data.date || 
                           (Array.isArray(data) ? data[0]?.datePublished : null);
      if (datePublished) {
        const parsed = parseDate(datePublished);
        if (parsed) {
          results.push({
            date: parsed,
            source: 'JSON-LD structured data',
            confidence: 'high',
            priority: 1
          });
        }
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  }

  // Strategy 3: <time> elements
  const timeElements = document.querySelectorAll('time[datetime], time[pubdate]');
  for (const time of timeElements) {
    const datetime = time.getAttribute('datetime') || time.getAttribute('pubdate');
    if (datetime) {
      const parsed = parseDate(datetime);
      if (parsed) {
        results.push({
          date: parsed,
          source: 'time element datetime attribute',
          confidence: 'high',
          priority: 2
        });
      }
    }
  }

  // Strategy 4: URL date patterns (e.g., /2024/11/12/)
  const urlDatePattern = /\/(20\d{2})\/(\d{1,2})\/(\d{1,2})\//;
  const urlMatch = url.match(urlDatePattern);
  if (urlMatch) {
    const [, year, month, day] = urlMatch;
    const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const parsed = parseDate(dateStr);
    if (parsed) {
      results.push({
        date: parsed,
        source: 'URL path pattern',
        confidence: 'medium',
        priority: 3
      });
    }
  }

  // Strategy 5: Common date class patterns
  const dateClassSelectors = [
    '.published-date',
    '.post-date',
    '.article-date',
    '.entry-date',
    '.date-published',
    '[class*="publish"]',
    '[class*="date"]'
  ];
  
  for (const selector of dateClassSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.textContent?.trim();
      if (text && text.length < 50) {
        const parsed = parseDate(text);
        if (parsed) {
          results.push({
            date: parsed,
            source: `element with class ${element.className}`,
            confidence: 'medium',
            priority: 4
          });
        }
      }
    }
  }

  // Sort by priority and confidence
  results.sort((a, b) => a.priority - b.priority);

  if (results.length === 0) {
    return {
      success: false,
      date: null,
      confidence: 'unknown',
      source: 'none',
      notes: 'No publication date could be extracted from any source'
    };
  }

  // Return the highest priority result
  const best = results[0];
  
  // Check for conflicting dates (sanity check)
  const uniqueDates = new Set(results.slice(0, 3).map(r => r.date));
  if (uniqueDates.size > 1) {
    return {
      success: true,
      date: best.date,
      confidence: 'medium',
      source: best.source,
      notes: `Multiple dates found: ${Array.from(uniqueDates).join(', ')}. Selected from ${best.source}`
    };
  }

  return {
    success: true,
    date: best.date,
    confidence: best.confidence,
    source: best.source,
    notes: results.length > 1 ? `Confirmed by ${results.length} sources` : null
  };
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // Clean the string
    let cleaned = dateStr.trim();
    
    // Try parsing as ISO date
    const isoDate = new Date(cleaned);
    if (!isNaN(isoDate.getTime()) && isoDate.getFullYear() > 2000 && isoDate.getFullYear() < 2100) {
      return isoDate.toISOString().split('T')[0];
    }

    // Try common formats
    const formats = [
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // 2024-11-12
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // 11/12/2024
      /(\d{1,2})-(\d{1,2})-(\d{4})/, // 12-11-2024
    ];

    for (const format of formats) {
      const match = cleaned.match(format);
      if (match) {
        const date = new Date(match[0]);
        if (!isNaN(date.getTime()) && date.getFullYear() > 2000 && date.getFullYear() < 2100) {
          return date.toISOString().split('T')[0];
        }
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}