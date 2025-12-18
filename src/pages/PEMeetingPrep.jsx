import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Loader2, FileText, Calendar, Eye, Plus, X } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { asArray, normalizeMeetingBrief, normalizeMeetingBriefList } from "@/components/utils/normalizeMeetingBrief";

const SECTOR_OPTIONS = [
  "Healthcare Services - Provider Groups",
  "Healthcare Services - Urgent Care",
  "Healthcare Services - Behavioral Health",
  "Healthcare Services - Home Health",
  "Healthcare Services - Hospice",
  "Healthcare Services - Post-Acute",
  "Healthcare Services - Outpatient Specialty",
  "Healthcare Services - Ancillary Services",
  "HCIT - RCM / Revenue Cycle",
  "HCIT - Practice Management",
  "HCIT - Digital Health / Virtual Care",
  "HCIT - Analytics & Insights",
  "HCIT - Care Coordination",
  "HCIT - Patient Engagement",
  "HCIT - Interoperability / Data Exchange",
  "HCIT - Clinical Decision Support",
  "Hybrid - Tech-Enabled Services"
];

export default function PEMeetingPrep() {
  const queryClient = useQueryClient();
  
  // Form state
  const [counterpartyType, setCounterpartyType] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [primaryUrl, setPrimaryUrl] = useState("");
  const [additionalUrls, setAdditionalUrls] = useState("");
  const [selectedSectors, setSelectedSectors] = useState([]);
  const [rolePerspective, setRolePerspective] = useState("");
  const [meetingDatetime, setMeetingDatetime] = useState("");
  const [meetingContext, setMeetingContext] = useState("");
  const [sectorInput, setSectorInput] = useState("");
  
  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentBrief, setCurrentBrief] = useState(() => normalizeMeetingBrief(null));
  const [viewingBriefId, setViewingBriefId] = useState(null);

  // Fetch brief history
  const { data: briefs = [], isLoading } = useQuery({
    queryKey: ['peMeetingBriefs'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        const res = await base44.entities.PEMeetingBrief.filter({ created_by: user.email }, "-created_date", 50);
        return normalizeMeetingBriefList(res);
      } catch (e) {
        console.error("Failed to load briefs:", e);
        return [];
      }
    },
    initialData: [],
  });

  const addSector = (sector) => {
    if (sector && !asArray(selectedSectors).includes(sector)) {
      setSelectedSectors([...asArray(selectedSectors), sector]);
    }
  };

  const removeSector = (sector) => {
    setSelectedSectors(asArray(selectedSectors).filter(s => s !== sector));
  };

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isFormValid = () => {
    return counterpartyName.trim() && 
           counterpartyType && 
           primaryUrl.trim() && 
           isValidUrl(primaryUrl);
  };

  const generateBrief = async () => {
    if (!isFormValid()) {
      toast.error("Please fill in all required fields with valid data");
      return;
    }

    setIsGenerating(true);
    try {
      // Parse additional URLs
      const urlArray = String(additionalUrls || "")
        .split('\n')
        .map(u => (u || "").trim())
        .filter(u => u && isValidUrl(u));

      // Prepare context for the agent
      const context = {
        counterparty_name: counterpartyName,
        counterparty_type: counterpartyType,
        primary_url: primaryUrl,
        additional_urls: asArray(urlArray),
        sectors: asArray(selectedSectors),
        role_perspective: rolePerspective || "PE Sponsor",
        meeting_datetime: meetingDatetime || null,
        meeting_context_notes: meetingContext || ""
      };

      // Call the agent to generate the brief
      const conversation = await base44.agents.createConversation({
        agent_name: "pe_meeting_brief_agent",
        metadata: {
          name: `Meeting Brief: ${counterpartyName}`,
          purpose: "initial_meeting_prep"
        }
      });

      const prompt = `Generate an Initial Meeting Brief for the following counterparty:

**Counterparty Name:** ${counterpartyName}
**Counterparty Type:** ${counterpartyType}
**Primary Website:** ${primaryUrl}
${asArray(urlArray).length > 0 ? `**Additional URLs:** ${asArray(urlArray).join(', ')}` : ''}
${asArray(selectedSectors).length > 0 ? `**Sectors:** ${asArray(selectedSectors).join(', ')}` : ''}
**Our Role:** ${rolePerspective || 'PE Sponsor'}
${meetingDatetime ? `**Meeting Date:** ${meetingDatetime}` : ''}
${meetingContext ? `**Meeting Context:** ${meetingContext}` : ''}

Please research this counterparty using web search and the provided URLs, then generate a comprehensive one-page Initial Meeting Brief following the structured format in your instructions.`;

      await base44.agents.addMessage(conversation, {
        role: "user",
        content: prompt
      });

      // Subscribe to get the response
      let briefMarkdown = "";
      let unsubscribe;
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (unsubscribe) unsubscribe();
          reject(new Error("Brief generation timed out after 2 minutes"));
        }, 120000); // 2 minute timeout

        unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
          // Bulletproof: handle undefined/null data
          if (!data) return;
          
          // Ensure messages is always an array
          const messages = asArray(data.messages || []);
          if (messages.length === 0) return;
          
          const lastMessage = messages[messages.length - 1];
          if (!lastMessage) return;
          
          if (lastMessage.role === "assistant") {
            if (lastMessage.content) {
              briefMarkdown = lastMessage.content;
            }
            
            if (lastMessage.status === "completed") {
              clearTimeout(timeout);
              resolve();
            } else if (lastMessage.status === "error") {
              clearTimeout(timeout);
              reject(new Error("Agent encountered an error: " + (lastMessage.error || "Unknown error")));
            }
          }
        });
      });

      if (!briefMarkdown || briefMarkdown.trim().length < 100) {
        throw new Error("Brief generation failed - no substantial content generated");
      }

      // Extract sources from the brief (look for ## 11. Sources Reviewed section)
      const sourcesMatch = briefMarkdown.match(/## 11\. Sources Reviewed\n([\s\S]*?)(?=\n## |$)/);
      const sourcesList = (sourcesMatch && sourcesMatch[1])
        ? String(sourcesMatch[1]).split('\n').filter(s => s && s.trim().startsWith('-')).map(s => s.replace(/^-\s*/, '').trim())
        : [primaryUrl, ...asArray(urlArray)];

      // Save the brief
      const savedBrief = await base44.entities.PEMeetingBrief.create({
        counterparty_name: counterpartyName,
        counterparty_type: counterpartyType,
        primary_url: primaryUrl,
        additional_urls: asArray(urlArray),
        sectors: asArray(selectedSectors),
        role_perspective: rolePerspective || "PE Sponsor",
        meeting_datetime: meetingDatetime || null,
        meeting_context_notes: meetingContext || "",
        brief_markdown: briefMarkdown,
        sources_list: asArray(sourcesList)
      });

      const normalized = normalizeMeetingBrief(savedBrief);
      setCurrentBrief(normalized);
      setViewingBriefId(normalized.id);
      queryClient.invalidateQueries({ queryKey: ['peMeetingBriefs'] });
      toast.success("Initial Meeting Brief generated successfully!");

    } catch (error) {
      console.error("Brief generation error:", error);
      toast.error(error.message || "Failed to generate brief. Please try again.");
    }
    setIsGenerating(false);
  };

  const viewBrief = (brief) => {
    const normalized = normalizeMeetingBrief(brief);
    setCurrentBrief(normalized);
    setViewingBriefId(normalized.id);
  };

  // Bulletproof brief selection
  const displayedBrief = React.useMemo(() => {
    let selectedBrief = currentBrief;
    
    if (viewingBriefId) {
      const found = asArray(briefs).find(b => b && b.id === viewingBriefId);
      if (found) selectedBrief = found;
    }
    
    return normalizeMeetingBrief(selectedBrief);
  }, [viewingBriefId, briefs, currentBrief]);

  return (
    <div className="p-6 md:p-10 max-w-[1800px] mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Briefcase className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">PE Meeting Prep</h1>
            <p className="text-slate-600 text-lg mt-1">
              Create a concise, PE-grade Initial Meeting Brief for an upcoming meeting with a company, sponsor, or other counterparty. 
              Focused on healthcare services and HCIT.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Input Form */}
        <div className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Brief Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="counterpartyType" className="text-sm font-semibold">
                  Counterparty Type <span className="text-red-500">*</span>
                </Label>
                <Select value={counterpartyType} onValueChange={setCounterpartyType}>
                  <SelectTrigger id="counterpartyType">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Company">Company</SelectItem>
                    <SelectItem value="Sponsor / PE">Sponsor / PE</SelectItem>
                    <SelectItem value="Lender">Lender</SelectItem>
                    <SelectItem value="Strategic">Strategic</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="counterpartyName" className="text-sm font-semibold">
                  Counterparty Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="counterpartyName"
                  value={counterpartyName}
                  onChange={(e) => setCounterpartyName(e.target.value)}
                  placeholder="e.g., Acme Healthcare Solutions"
                />
              </div>

              <div>
                <Label htmlFor="primaryUrl" className="text-sm font-semibold">
                  Primary Website URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="primaryUrl"
                  type="url"
                  value={primaryUrl}
                  onChange={(e) => setPrimaryUrl(e.target.value)}
                  placeholder="https://www.example.com"
                />
                {primaryUrl && !isValidUrl(primaryUrl) && (
                  <p className="text-xs text-red-600 mt-1">Please enter a valid URL</p>
                )}
              </div>

              <div>
                <Label htmlFor="additionalUrls" className="text-sm font-semibold">
                  Additional URLs (Optional)
                </Label>
                <Textarea
                  id="additionalUrls"
                  value={additionalUrls}
                  onChange={(e) => setAdditionalUrls(e.target.value)}
                  placeholder="One URL per line (news, press releases, filings, etc.)"
                  rows={3}
                  className="text-sm"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  Sector / Focus Tags (Recommended)
                </Label>
                <div className="flex gap-2 mb-2">
                  <Select value={sectorInput} onValueChange={(value) => {
                    addSector(value);
                    setSectorInput("");
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add sector..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTOR_OPTIONS.filter(s => !asArray(selectedSectors).includes(s)).map(sector => (
                        <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {asArray(selectedSectors).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {asArray(selectedSectors).map(sector => (
                      <Badge key={sector} variant="secondary" className="cursor-pointer" onClick={() => removeSector(sector)}>
                        {sector}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="rolePerspective" className="text-sm font-semibold">
                  Our Role / Perspective (Optional)
                </Label>
                <Select value={rolePerspective} onValueChange={setRolePerspective}>
                  <SelectTrigger id="rolePerspective">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PE Sponsor">PE Sponsor</SelectItem>
                    <SelectItem value="Growth Equity">Growth Equity</SelectItem>
                    <SelectItem value="Lender">Lender</SelectItem>
                    <SelectItem value="Investment Bank (Sell-side)">Investment Bank (Sell-side)</SelectItem>
                    <SelectItem value="Investment Bank (Buy-side)">Investment Bank (Buy-side)</SelectItem>
                    <SelectItem value="Strategic Corporate">Strategic Corporate</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="meetingDatetime" className="text-sm font-semibold">
                  Meeting Date & Time (Optional)
                </Label>
                <Input
                  id="meetingDatetime"
                  type="datetime-local"
                  value={meetingDatetime}
                  onChange={(e) => setMeetingDatetime(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="meetingContext" className="text-sm font-semibold">
                  Meeting Context / Objectives (Optional)
                </Label>
                <Textarea
                  id="meetingContext"
                  value={meetingContext}
                  onChange={(e) => setMeetingContext(e.target.value)}
                  placeholder="What we're trying to accomplish in this meeting..."
                  rows={3}
                  className="text-sm"
                />
              </div>

              <Button
                onClick={generateBrief}
                disabled={!isFormValid() || isGenerating}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating Brief...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5 mr-2" />
                    Generate Initial Meeting Brief
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Brief Preview & History */}
        <div className="space-y-6">
          {/* Brief Preview */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Initial Meeting Brief
                {displayedBrief && (
                  <Badge variant="outline" className="ml-auto">
                    {format(new Date(displayedBrief.created_date), "MMM d, yyyy 'at' h:mm a")}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!displayedBrief || !displayedBrief.id ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 mb-2">No brief generated yet</p>
                  <p className="text-sm text-slate-500">
                    Fill in the form and click "Generate Initial Meeting Brief" to create your first brief.
                  </p>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-indigo-700 mb-1 font-semibold">
                      {displayedBrief.counterparty_name} ({displayedBrief.counterparty_type})
                    </p>
                    <p className="text-xs text-indigo-600">
                      Generated by PE Healthcare Meeting Brief Agent
                    </p>
                  </div>
                  
                  <ReactMarkdown
                    components={{
                      h2: ({ children }) => <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3 border-b pb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">{children}</h3>,
                      p: ({ children }) => <p className="text-slate-700 leading-relaxed mb-3">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc ml-5 mb-3 space-y-1">{children}</ul>,
                      li: ({ children }) => <li className="text-slate-700">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                    }}
                  >
                    {displayedBrief.brief_markdown}
                  </ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Brief History */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Prior Briefs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-slate-600">Loading history...</p>
              ) : asArray(briefs).length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No briefs generated yet</p>
              ) : (
                <div className="space-y-2">
                  {asArray(briefs).filter(b => b && b.id).map((brief, index) => {
                    const normalizedBrief = normalizeMeetingBrief(brief);
                    if (!normalizedBrief || !normalizedBrief.id) return null;
                    return (
                    <div
                      key={normalizedBrief.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        viewingBriefId === normalizedBrief.id
                          ? 'bg-indigo-50 border-indigo-300'
                          : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                      }`}
                      onClick={() => viewBrief(normalizedBrief)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 text-sm">{normalizedBrief.counterparty_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{normalizedBrief.counterparty_type}</Badge>
                            <span className="text-xs text-slate-500">
                              {format(new Date(normalizedBrief.created_date), "MMM d, yyyy")}
                            </span>
                          </div>
                          {asArray(normalizedBrief.sectors).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {asArray(normalizedBrief.sectors).slice(0, 2).map((sector, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {(sector && sector.split ? sector.split(' - ')[1] : null) || sector}
                                </Badge>
                              ))}
                              {asArray(normalizedBrief.sectors).length > 2 && (
                                <Badge variant="secondary" className="text-xs">+{asArray(normalizedBrief.sectors).length - 2}</Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
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