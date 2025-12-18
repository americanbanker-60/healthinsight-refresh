// BULLETPROOF array helper - NEVER returns undefined
export const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (v == null || v === undefined) return [];
  if (typeof v === 'string' && v.trim() === '') return [];
  return [v];
};

// Safe string conversion
const asString = (v, fallback = '') => {
  if (v == null || v === undefined) return fallback;
  if (typeof v === 'string') return v;
  return String(v);
};

export const normalizeMeetingBrief = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return {
      id: null,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      counterparty_type: '',
      counterparty_name: '',
      primary_url: '',
      meeting_datetime: null,
      meeting_context_notes: '',
      sectors: [],
      additional_urls: [],
      sources_list: [],
      source_names: [],
      uploaded_files: [],
      brief_markdown: '',
      role_perspective: '',
    };
  }

  const b = raw;
  return {
    id: b.id ?? b._id ?? null,
    created_date: asString(b.created_date ?? b.createdAt, new Date().toISOString()),
    updated_date: asString(b.updated_date ?? b.updatedAt, new Date().toISOString()),
    counterparty_type: asString(b.counterparty_type ?? b.counterpartyType),
    counterparty_name: asString(b.counterparty_name ?? b.counterpartyName),
    primary_url: asString(b.primary_url ?? b.primaryWebsiteUrl),
    meeting_datetime: b.meeting_datetime ?? b.meetingDateTime ?? null,
    meeting_context_notes: asString(b.meeting_context_notes ?? b.meetingContext),
    sectors: asArray(b.sectors ?? b.sectorTags),
    additional_urls: asArray(b.additional_urls ?? b.additionalUrls),
    sources_list: asArray(b.sources_list ?? b.sources),
    source_names: asArray(b.source_names ?? b.sourceNames),
    uploaded_files: asArray(b.uploaded_files ?? b.uploadedFiles),
    brief_markdown: asString(b.brief_markdown ?? b.briefMarkdown),
    role_perspective: asString(b.role_perspective ?? b.rolePerspective),
  };
};

export const normalizeMeetingBriefList = (rawList) =>
  asArray(rawList).map(normalizeMeetingBrief);