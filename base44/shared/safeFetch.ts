// Shared URL + fetch helpers for backend analysis functions.
// SSRF-safe fetching, consistent URL normalization, and lightweight HTML→text extraction.

const TIMEOUT_MS = 20000;
const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB
const DEFAULT_UA = 'Mozilla/5.0 (compatible; HealthInsightBot/1.0)';

/**
 * Normalize a URL: trim, parse, lowercase ONLY protocol + hostname,
 * strip trailing slashes from the pathname, drop the hash, return href.
 * Throws on non-http(s) schemes or unparseable input.
 */
export function normalizeUrl(u) {
  if (typeof u !== 'string') throw new Error('URL must be a string');
  const trimmed = u.trim();
  if (!trimmed) throw new Error('URL is empty');

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (_) {
    throw new Error(`Invalid URL: ${trimmed}`);
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error(`Unsupported scheme: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();
  let pathname = parsed.pathname;
  if (pathname.length > 1) {
    pathname = pathname.replace(/\/+$/, '');
  }
  const portPart = parsed.port ? `:${parsed.port}` : '';
  // hash intentionally dropped; search (query) preserved
  return `${protocol}//${hostname}${portPart}${pathname}${parsed.search}`;
}

function isDisallowedHost(rawHost) {
  const h = rawHost.toLowerCase().replace(/^\[|\]$/g, '');

  if (h === 'localhost') return true;
  if (h.endsWith('.internal') || h.endsWith('.local')) return true;

  // IPv4 literal
  const m4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m4) {
    const a = parseInt(m4[1], 10);
    const b = parseInt(m4[2], 10);
    if (a === 10) return true;              // 10/8
    if (a === 127) return true;             // 127/8
    if (a === 169 && b === 254) return true; // 169.254/16
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true; // 192.168/16
    return false;
  }

  // IPv6 literal
  if (h === '::1' || h === '::') return true;
  // fc00::/7 — first hex octet 0xfc..0xfd
  if (/^f[c-d][0-9a-f]{0,2}(:|$)/.test(h)) return true;

  return false;
}

function validateHost(hostname) {
  if (isDisallowedHost(hostname)) {
    throw new Error(`Blocked host: ${hostname}`);
  }
}

/**
 * SSRF-safe fetch: validates scheme + host, rejects private/loopback/link-local
 * hosts and .internal/.local suffixes, enforces a 20s timeout, sets a User-Agent,
 * follows at most 3 redirects (re-validating each hop), and caps the body at 2 MB.
 * Returns { url, text, status, ok }.
 */
export async function safeFetch(url, opts = {}) {
  let current = normalizeUrl(url);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const parsed = new URL(current);
      validateHost(parsed.hostname);

      const resp = await fetch(current, {
        method: opts.method || 'GET',
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': opts.userAgent || DEFAULT_UA,
          ...(opts.headers || {}),
        },
      });

      if (resp.status >= 300 && resp.status < 400) {
        const loc = resp.headers.get('location');
        if (!loc) throw new Error('Redirect response missing Location header');
        current = normalizeUrl(new URL(loc, current).href);
        continue;
      }

      if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);

      const buf = await resp.arrayBuffer();
      const capped = buf.byteLength > MAX_BODY_BYTES ? buf.slice(0, MAX_BODY_BYTES) : buf;
      const text = new TextDecoder('utf-8', { fatal: false }).decode(capped);
      return { url: current, text, status: resp.status, ok: true };
    }
    throw new Error('Exceeded maximum of 3 redirects');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extract readable text from an HTML string: strips script/style/noscript/nav/
 * header/footer blocks, prefers <article> or <main> content when present, strips
 * remaining tags, decodes common entities, and collapses whitespace.
 */
export function extractText(html) {
  if (!html) return '';
  let s = String(html);

  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  s = s.replace(/<nav[\s\S]*?<\/nav>/gi, ' ');
  s = s.replace(/<header[\s\S]*?<\/header>/gi, ' ');
  s = s.replace(/<footer[\s\S]*?<\/footer>/gi, ' ');

  // Prefer main content region if present
  const main = s.match(/<article[\s\S]*?<\/article>/i) || s.match(/<main[\s\S]*?<\/main>/i);
  if (main) s = main[0];

  s = s.replace(/<[^>]+>/g, ' ');
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}