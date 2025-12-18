export const asArray = (v) => (Array.isArray(v) ? v : []);

export const normalizeMeetingBrief = (raw) => {
  const b = raw ?? {};
  return {
    ...b,
    id: b.id ?? b._id ?? null,
    created_date: b.created_date ?? b.createdAt ?? new Date().toISOString(),
    counterparty_type: b.counterparty_type ?? b.counterpartyType ?? "",
    counterparty_name: b.counterparty_name ?? b.counterpartyName ?? "",
    primary_url: b.primary_url ?? b.primaryWebsiteUrl ?? "",
    meeting_datetime: b.meeting_datetime ?? b.meetingDateTime ?? null,
    meeting_context_notes: b.meeting_context_notes ?? b.meetingContext ?? "",
    sectors: asArray(b.sectors ?? b.sectorTags),
    additional_urls: asArray(b.additional_urls ?? b.additionalUrls),
    sources_list: asArray(b.sources_list ?? b.sources),
    brief_markdown: b.brief_markdown ?? b.briefMarkdown ?? "",
    role_perspective: b.role_perspective ?? b.rolePerspective ?? "",
  };
};

export const normalizeMeetingBriefList = (rawList) =>
  asArray(rawList).map(normalizeMeetingBrief);