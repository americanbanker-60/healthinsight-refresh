import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Loader2, FileText, Plus, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";

const MEETING_TYPES = ["intro", "diligence", "follow-up", "management", "other"];
const ROLES = [
  "PE Sponsor",
  "Growth Equity",
  "Lender",
  "Investment Bank (Sell-side)",
  "Investment Bank (Buy-side)",
  "Strategic Corporate",
  "Other"
];

const SECTORS = [
  "Healthcare Services - Provider Groups",
  "Healthcare Services - Urgent Care",
  "Healthcare Services - Behavioral Health",
  "HCIT - RCM / Revenue Cycle",
  "HCIT - Practice Management",
  "HCIT - Digital Health / Virtual Care",
  "HCIT - Analytics & Insights",
  "Hybrid - Tech-Enabled Services"
];

// Safe array helper
const safeArray = (val) => Array.isArray(val) ? val : [];

// Convert brief JSON to markdown
const briefToMarkdown = (briefJson) => {
  if (!briefJson || typeof briefJson !== 'object') return "# Brief not available";
  
  const meta = briefJson.meta || {};
  const exec = briefJson.executiveSummary || {};
  const snapshot = briefJson.companySnapshot || {};
  const context = briefJson.investmentContext || {};
  const sponsor = briefJson.sponsorPerspective || {};
  const plan = briefJson.meetingPlan || {};
  const questions = briefJson.questions || {};
  const followups = briefJson.followUps || {};
  const sources = safeArray(briefJson.sourcesUsed);
  const intelligence = safeArray(briefJson.relevantIntelligence);

  let md = `# ${meta.companyName || "Company"} — Meeting Prep Brief\n\n`;
  
  md += `## Executive Summary\n`;
  md += `**One-liner:** ${exec.oneLiner || "N/A"}\n\n`;
  if (safeArray(exec.keyPoints).length > 0) {
    md += `**Key points:**\n`;
    safeArray(exec.keyPoints).forEach(p => md += `- ${p}\n`);
    md += `\n`;
  }

  md += `## Company Snapshot\n`;
  md += `${snapshot.whatTheyDo || "No information available"}\n\n`;
  if (snapshot.businessModel) md += `**Business model:** ${snapshot.businessModel}\n\n`;
  if (snapshot.customers) md += `**Customers:** ${snapshot.customers}\n\n`;
  if (snapshot.geography) md += `**Geography:** ${snapshot.geography}\n\n`;
  if (safeArray(snapshot.sizeIndicators).length > 0) {
    md += `**Size indicators:**\n`;
    safeArray(snapshot.sizeIndicators).forEach(s => md += `- ${s}\n`);
    md += `\n`;
  }

  md += `## Investment Context\n`;
  if (safeArray(context.whyNow).length > 0) {
    md += `### Why Now\n`;
    safeArray(context.whyNow).forEach(w => md += `- ${w}\n`);
    md += `\n`;
  }
  if (safeArray(context.marketTailwinds).length > 0) {
    md += `### Tailwinds\n`;
    safeArray(context.marketTailwinds).forEach(t => md += `- ${t}\n`);
    md += `\n`;
  }
  if (safeArray(context.marketHeadwinds).length > 0) {
    md += `### Headwinds\n`;
    safeArray(context.marketHeadwinds).forEach(h => md += `- ${h}\n`);
    md += `\n`;
  }
  if (safeArray(context.keyRisks).length > 0) {
    md += `### Key Risks\n`;
    safeArray(context.keyRisks).forEach(r => md += `- ${r}\n`);
    md += `\n`;
  }
  if (safeArray(context.diligenceFocusAreas).length > 0) {
    md += `### Diligence Focus Areas\n`;
    safeArray(context.diligenceFocusAreas).forEach(d => md += `- ${d}\n`);
    md += `\n`;
  }

  md += `## Sponsor Perspective\n`;
  if (safeArray(sponsor.whatSponsorLikelyCaresAbout).length > 0) {
    md += `**What they likely care about:**\n`;
    safeArray(sponsor.whatSponsorLikelyCaresAbout).forEach(c => md += `- ${c}\n`);
    md += `\n`;
  }
  if (safeArray(sponsor.questionsToAskSponsor).length > 0) {
    md += `**Questions to ask sponsor:**\n`;
    safeArray(sponsor.questionsToAskSponsor).forEach(q => md += `- ${q}\n`);
    md += `\n`;
  }

  md += `## Meeting Plan\n`;
  if (safeArray(plan.agenda).length > 0) {
    md += `**Agenda:**\n`;
    safeArray(plan.agenda).forEach(a => md += `- ${a}\n`);
    md += `\n`;
  }
  if (safeArray(plan.yourGoals).length > 0) {
    md += `**Your goals:**\n`;
    safeArray(plan.yourGoals).forEach(g => md += `- ${g}\n`);
    md += `\n`;
  }
  if (safeArray(plan.theirGoals).length > 0) {
    md += `**Their goals:**\n`;
    safeArray(plan.theirGoals).forEach(g => md += `- ${g}\n`);
    md += `\n`;
  }

  md += `## Questions\n`;
  if (safeArray(questions.mustAsk).length > 0) {
    md += `### Must Ask\n`;
    safeArray(questions.mustAsk).forEach(q => md += `- ${q}\n`);
    md += `\n`;
  }
  if (safeArray(questions.niceToHave).length > 0) {
    md += `### Nice to Have\n`;
    safeArray(questions.niceToHave).forEach(q => md += `- ${q}\n`);
    md += `\n`;
  }
  if (safeArray(questions.redFlags).length > 0) {
    md += `### Red Flags\n`;
    safeArray(questions.redFlags).forEach(q => md += `- ${q}\n`);
    md += `\n`;
  }

  md += `## Follow-ups\n`;
  if (safeArray(followups.dataRequests).length > 0) {
    md += `### Data Requests\n`;
    safeArray(followups.dataRequests).forEach(d => md += `- ${d}\n`);
    md += `\n`;
  }
  if (followups.nextStepsEmailDraft) {
    md += `### Next Steps Email Draft\n${followups.nextStepsEmailDraft}\n\n`;
  }

  if (intelligence.length > 0) {
    md += `## Relevant Internal Intelligence\n`;
    md += `Based on portfolio companies identified, the following HealthInsight content is relevant:\n\n`;
    intelligence.forEach(item => {
      md += `### ${item.title}\n`;
      md += `**Company:** ${item.company_mentioned} | **Source:** ${item.source_name} | **Date:** ${item.publication_date || "N/A"}\n\n`;
      if (item.tldr) md += `**Summary:** ${item.tldr}\n\n`;
      if (item.key_takeaways.length > 0) {
        md += `**Key Takeaways:**\n`;
        item.key_takeaways.forEach(kt => md += `- ${kt}\n`);
        md += `\n`;
      }
    });
  }

  if (sources.length > 0) {
    md += `## Sources Used\n`;
    sources.forEach(s => {
      md += `- ${s.type || "source"}: ${s.title || s.ref || "N/A"}\n`;
    });
  }

  return md;
};

export default function PEMeetingPrep() {
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    companyName: "",
    sponsorName: "",
    meetingType: "intro",
    meetingDate: "",
    objective: "",
    notes: "",
    urls: [""],
    sectors: [],
    role: "PE Sponsor"
  });
  
  const [generating, setGenerating] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [discoveredHoldings, setDiscoveredHoldings] = useState([]);

  const { data: briefs = [] } = useQuery({
    queryKey: ['peMeetingBriefs'],
    queryFn: async () => {
      const res = await base44.entities.PEMeetingBrief.list("-created_date", 50);
      return safeArray(res);
    }
  });

  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const addUrl = () => {
    setForm(prev => ({ ...prev, urls: [...prev.urls, ""] }));
  };

  const updateUrl = (index, value) => {
    setForm(prev => {
      const newUrls = [...prev.urls];
      newUrls[index] = value;
      return { ...prev, urls: newUrls };
    });
  };

  const removeUrl = (index) => {
    setForm(prev => ({ ...prev, urls: prev.urls.filter((_, i) => i !== index) }));
  };

  const toggleSector = (sector) => {
    setForm(prev => ({
      ...prev,
      sectors: prev.sectors.includes(sector)
        ? prev.sectors.filter(s => s !== sector)
        : [...prev.sectors, sector]
    }));
  };

  const canGenerate = form.companyName.trim() && form.meetingType;

  const discoverHoldings = async (peFirmName) => {
    try {
      const holdingsPrompt = `Research the current and past healthcare portfolio companies of ${peFirmName}. 
      
Return ONLY a valid JSON array of company objects with this exact structure:
[
  {
    "company_name": "string",
    "sector": "string",
    "holding_status": "current|past",
    "acquisition_date": "YYYY-MM-DD|null",
    "exit_date": "YYYY-MM-DD|null"
  }
]

Use web search to find accurate information about all their healthcare holdings. Be comprehensive. If unsure of exact dates, use null.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: holdingsPrompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              company_name: { type: "string" },
              sector: { type: "string" },
              holding_status: { type: "string" },
              acquisition_date: { type: "string" },
              exit_date: { type: "string" }
            }
          }
        }
      });

      const holdings = Array.isArray(result) ? result : [];
      setDiscoveredHoldings(holdings);
      
      if (holdings.length > 0) {
        toast.success(`Discovered ${holdings.length} portfolio companies for ${peFirmName}`);
      }
      
      return holdings;
    } catch (err) {
      console.error("Holdings discovery error:", err);
      toast.error("Failed to discover portfolio companies");
      return [];
    }
  };

  const fetchRelevantIntelligence = async (holdings) => {
    if (!holdings || holdings.length === 0) return [];
    
    try {
      // Get company names from holdings
      const companyNames = holdings.map(h => h.company_name);
      
      // Query for related newsletters via NewsletterRelation
      const relations = await base44.entities.NewsletterRelation.filter(
        { entity_type: "company" },
        "-created_date",
        500
      );
      
      // Filter relations for discovered holdings
      const relevantRelations = relations.filter(r => 
        companyNames.some(name => name.toLowerCase() === r.entity_name.toLowerCase())
      );
      
      if (relevantRelations.length === 0) return [];
      
      // Get unique newsletter IDs
      const newsletterIds = [...new Set(relevantRelations.map(r => r.newsletter_id))];
      
      // Fetch newsletter details
      const newsletters = await base44.entities.Newsletter.filter(
        { id: { $in: newsletterIds } },
        "-publication_date",
        100
      );
      
      // Map newsletters with their related company
      const intelligence = newsletters.map(n => {
        const relation = relevantRelations.find(r => r.newsletter_id === n.id);
        return {
          newsletter_id: n.id,
          title: n.title,
          company_mentioned: relation.entity_name,
          publication_date: n.publication_date,
          source_name: n.source_name,
          tldr: n.tldr,
          key_takeaways: safeArray(n.key_takeaways).slice(0, 2)
        };
      });
      
      return intelligence;
    } catch (err) {
      console.error("Failed to fetch relevant intelligence:", err);
      return [];
    }
  };

  const generate = async () => {
    if (!canGenerate || generating) return;

    setGenerating(true);
    try {
      let relevantIntelligence = [];
      
      // If a PE Firm name is provided, discover its holdings and fetch relevant intelligence
      if (form.sponsorName.trim()) {
        const holdings = await discoverHoldings(form.sponsorName.trim());
        relevantIntelligence = await fetchRelevantIntelligence(holdings);
      }

      const validUrls = form.urls.filter(u => {
        const trimmed = u.trim();
        if (!trimmed) return false;
        try { new URL(trimmed); return true; } catch { return false; }
      });

      const prompt = `Generate a comprehensive PE Meeting Prep brief in STRICT JSON format. Every property must exist. Use empty arrays [] or null where unknown.

REQUEST:
- companyName: ${form.companyName}
- sponsorName: ${form.sponsorName || "N/A"}
- meetingType: ${form.meetingType}
- meetingDate: ${form.meetingDate || "N/A"}
- objective: ${form.objective || "N/A"}
- notes: ${form.notes || "N/A"}
- sectors: ${form.sectors.join(", ") || "N/A"}
- role: ${form.role}
- urls: ${validUrls.join(", ") || "None"}
- discoveredHoldings: ${discoveredHoldings.length > 0 ? JSON.stringify(discoveredHoldings.map(h => h.company_name)) : "None"}

OUTPUT EXACTLY THIS JSON SCHEMA:
{
  "meta": {
    "companyName": "string",
    "sponsorName": "string|null",
    "meetingType": "intro|diligence|follow-up|management|other",
    "meetingDate": "YYYY-MM-DD|null",
    "generatedAt": "ISO datetime string"
  },
  "executiveSummary": {
    "oneLiner": "string",
    "keyPoints": ["string", "string", "string"]
  },
  "companySnapshot": {
    "whatTheyDo": "string",
    "businessModel": "string",
    "customers": "string|null",
    "geography": "string|null",
    "sizeIndicators": ["string"]
  },
  "investmentContext": {
    "whyNow": ["string"],
    "marketTailwinds": ["string"],
    "marketHeadwinds": ["string"],
    "keyRisks": ["string"],
    "diligenceFocusAreas": ["string"]
  },
  "sponsorPerspective": {
    "whatSponsorLikelyCaresAbout": ["string"],
    "questionsToAskSponsor": ["string"]
  },
  "meetingPlan": {
    "agenda": ["string"],
    "yourGoals": ["string"],
    "theirGoals": ["string"]
  },
  "questions": {
    "mustAsk": ["string"],
    "niceToHave": ["string"],
    "redFlags": ["string"]
  },
  "followUps": {
    "dataRequests": ["string"],
    "nextStepsEmailDraft": "string"
  },
  "relevantIntelligence": [
    {
      "newsletter_id": "string",
      "title": "string",
      "company_mentioned": "string",
      "publication_date": "YYYY-MM-DD",
      "source_name": "string",
      "tldr": "string",
      "key_takeaways": ["string"]
    }
  ],
  "sourcesUsed": [
    { "type": "url|note", "ref": "string", "title": "string|null" }
  ]
}

Research the company using available web search if URLs provided, or use the request info to create a professional brief. Output ONLY valid JSON matching this schema exactly. No markdown, no preamble.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: validUrls.length > 0,
        response_json_schema: {
          type: "object",
          properties: {
            meta: { 
              type: "object",
              properties: {
                companyName: { type: "string" },
                sponsorName: { type: "string" },
                meetingType: { type: "string" },
                meetingDate: { type: "string" },
                generatedAt: { type: "string" }
              }
            },
            executiveSummary: { 
              type: "object",
              properties: {
                oneLiner: { type: "string" },
                keyPoints: { type: "array", items: { type: "string" } }
              }
            },
            companySnapshot: { 
              type: "object",
              properties: {
                whatTheyDo: { type: "string" },
                businessModel: { type: "string" },
                customers: { type: "string" },
                geography: { type: "string" },
                sizeIndicators: { type: "array", items: { type: "string" } }
              }
            },
            investmentContext: { 
              type: "object",
              properties: {
                whyNow: { type: "array", items: { type: "string" } },
                marketTailwinds: { type: "array", items: { type: "string" } },
                marketHeadwinds: { type: "array", items: { type: "string" } },
                keyRisks: { type: "array", items: { type: "string" } },
                diligenceFocusAreas: { type: "array", items: { type: "string" } }
              }
            },
            sponsorPerspective: { 
              type: "object",
              properties: {
                whatSponsorLikelyCaresAbout: { type: "array", items: { type: "string" } },
                questionsToAskSponsor: { type: "array", items: { type: "string" } }
              }
            },
            meetingPlan: { 
              type: "object",
              properties: {
                agenda: { type: "array", items: { type: "string" } },
                yourGoals: { type: "array", items: { type: "string" } },
                theirGoals: { type: "array", items: { type: "string" } }
              }
            },
            questions: { 
              type: "object",
              properties: {
                mustAsk: { type: "array", items: { type: "string" } },
                niceToHave: { type: "array", items: { type: "string" } },
                redFlags: { type: "array", items: { type: "string" } }
              }
            },
            followUps: { 
              type: "object",
              properties: {
                dataRequests: { type: "array", items: { type: "string" } },
                nextStepsEmailDraft: { type: "string" }
              }
            },
            relevantIntelligence: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  newsletter_id: { type: "string" },
                  title: { type: "string" },
                  company_mentioned: { type: "string" },
                  publication_date: { type: "string" },
                  source_name: { type: "string" },
                  tldr: { type: "string" },
                  key_takeaways: { type: "array", items: { type: "string" } }
                }
              }
            },
            sourcesUsed: { 
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  ref: { type: "string" },
                  title: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Validate and normalize
      const briefJson = result || {};
      briefJson.relevantIntelligence = relevantIntelligence;
      const markdown = briefToMarkdown(briefJson);

      const saved = await base44.entities.PEMeetingBrief.create({
        counterparty_name: form.companyName,
        counterparty_type: form.sponsorName ? "Sponsor / PE" : "Company",
        primary_url: validUrls[0] || "",
        additional_urls: validUrls.slice(1),
        sectors: form.sectors,
        role_perspective: form.role,
        meeting_datetime: form.meetingDate || null,
        meeting_context_notes: form.objective + "\n\n" + form.notes,
        brief_markdown: markdown,
        sources_list: validUrls
      });

      setViewingId(saved.id);
      queryClient.invalidateQueries(['peMeetingBriefs']);
      toast.success("Brief generated successfully!");
      
    } catch (err) {
      console.error("Generation error:", err);
      toast.error(err.message || "Failed to generate brief");
    }
    setGenerating(false);
  };

  const viewing = briefs.find(b => b && b.id === viewingId);

  return (
    <div className="p-6 md:p-10 max-w-[1800px] mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
          <Briefcase className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-900">PE Meeting Prep</h1>
          <p className="text-slate-600 text-lg mt-1">Generate comprehensive meeting briefs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Company Name <span className="text-red-500">*</span></Label>
              <Input
                value={form.companyName}
                onChange={(e) => updateForm('companyName', e.target.value)}
                placeholder="ABC Healthcare"
              />
            </div>

            <div>
              <Label>Sponsor / PE Firm Name</Label>
              <Input
                value={form.sponsorName}
                onChange={(e) => updateForm('sponsorName', e.target.value)}
                placeholder="XYZ Capital"
              />
            </div>

            <div>
              <Label>Meeting Type <span className="text-red-500">*</span></Label>
              <Select value={form.meetingType} onValueChange={(v) => updateForm('meetingType', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Our Role</Label>
              <Select value={form.role} onValueChange={(v) => updateForm('role', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Meeting Date</Label>
              <Input
                type="date"
                value={form.meetingDate}
                onChange={(e) => updateForm('meetingDate', e.target.value)}
              />
            </div>

            <div>
              <Label>Objective</Label>
              <Textarea
                value={form.objective}
                onChange={(e) => updateForm('objective', e.target.value)}
                placeholder="Meeting goals..."
                rows={2}
              />
            </div>

            <div>
              <Label>Additional Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => updateForm('notes', e.target.value)}
                placeholder="Context, background..."
                rows={2}
              />
            </div>

            <div>
              <Label>Source URLs</Label>
              {form.urls.map((url, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Input
                    value={url}
                    onChange={(e) => updateUrl(idx, e.target.value)}
                    placeholder="https://example.com"
                  />
                  {form.urls.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeUrl(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addUrl}>
                <Plus className="w-4 h-4 mr-2" />
                Add URL
              </Button>
            </div>

            <div>
              <Label>Sectors</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {SECTORS.map(s => (
                  <Badge
                    key={s}
                    variant={form.sectors.includes(s) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSector(s)}
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              onClick={generate}
              disabled={!canGenerate || generating}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Brief...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Generate Brief
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle>Brief Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {!viewing ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No brief selected</p>
                  <p className="text-sm text-slate-500 mt-2">Generate a brief to see it here</p>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-indigo-900">{viewing.counterparty_name}</p>
                      <p className="text-xs text-indigo-600 mt-1">
                        Generated {format(new Date(viewing.created_date), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <ReactMarkdown>{viewing.brief_markdown || "Brief not available"}</ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle>History ({briefs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {briefs.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No briefs yet</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {briefs.map(b => {
                    if (!b || !b.id) return null;
                    return (
                      <div
                        key={b.id}
                        className={`p-3 border rounded-lg cursor-pointer transition ${
                          viewingId === b.id
                            ? 'bg-indigo-50 border-indigo-300'
                            : 'hover:bg-slate-50 border-slate-200'
                        }`}
                        onClick={() => setViewingId(b.id)}
                      >
                        <p className="font-semibold text-sm">{b.counterparty_name || "Unnamed"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {b.counterparty_type || "N/A"}
                          </Badge>
                          {b.created_date && (
                            <span className="text-xs text-slate-500">
                              {format(new Date(b.created_date), "MMM d")}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}