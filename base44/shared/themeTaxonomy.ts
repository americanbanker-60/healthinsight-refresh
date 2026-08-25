// Shared theme-taxonomy helpers used by canonicalizeThemes and classifyRemainingThemes.

export const norm = (s) => (s || '').toString().toLowerCase().trim();

export const dedupeArr = (arr) => [...new Set((arr || []).map(norm).filter(Boolean))];

// Build an alias->canonical map from Topic records (topic_name + keywords are aliases).
export function buildAliasMap(topics) {
  const map = new Map();
  for (const t of (topics || [])) {
    const canonical = (t.topic_name || '').trim();
    if (!canonical) continue;
    for (const a of dedupeArr([canonical, ...(t.keywords || [])])) {
      if (!map.has(a)) map.set(a, canonical);
    }
  }
  return map;
}

// Map a raw theme label to its canonical form via the alias map, or null if unmapped.
export function canonicalize(label, aliasMap) {
  const n = norm(label);
  if (!n) return null;
  if (aliasMap.has(n)) return aliasMap.get(n);
  const stripped = n.replace(/[.,;:!?]+$/, '');
  if (aliasMap.has(stripped)) return aliasMap.get(stripped);
  return null;
}