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
import { Briefcase, Loader2, FileText, Calendar, Eye, X } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";

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

export default function PEMeetingPrep() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    type: "",
    name: "",
    url: "",
    urls: "",
    sectors: [],
    role: "PE Sponsor",
    datetime: "",
    context: ""
  });
  const [generating, setGenerating] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const { data: briefs = [] } = useQuery({
    queryKey: ['briefs'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const res = await base44.entities.PEMeetingBrief.filter(
        { created_by: user.email }, 
        "-created_date", 
        50
      );
      return Array.isArray(res) ? res : [];
    }
  });

  const validUrl = (url) => {
    try { new URL(url); return true; } catch { return false; }
  };

  const canGenerate = formData.name && formData.type && formData.url && validUrl(formData.url);

  const generate = async () => {
    if (!canGenerate) return;
    
    setGenerating(true);
    try {
      const extraUrls = formData.urls.split('\n').map(u => u.trim()).filter(u => u && validUrl(u));
      
      const conv = await base44.agents.createConversation({
        agent_name: "pe_meeting_brief_agent",
        metadata: { name: `Brief: ${formData.name}` }
      });

      await base44.agents.addMessage(conv, {
        role: "user",
        content: `Generate an Initial Meeting Brief:

**Name:** ${formData.name}
**Type:** ${formData.type}
**Website:** ${formData.url}
${extraUrls.length > 0 ? `**Additional URLs:** ${extraUrls.join(', ')}` : ''}
${formData.sectors.length > 0 ? `**Sectors:** ${formData.sectors.join(', ')}` : ''}
**Our Role:** ${formData.role}
${formData.datetime ? `**Meeting:** ${formData.datetime}` : ''}
${formData.context ? `**Context:** ${formData.context}` : ''}

Research and generate a comprehensive brief.`
      });

      let markdown = "";
      let unsub;
      
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          unsub?.();
          reject(new Error("Timeout"));
        }, 120000);

        unsub = base44.agents.subscribeToConversation(conv.id, (d) => {
          if (!d?.messages) return;
          const msgs = d.messages;
          if (!Array.isArray(msgs) || msgs.length === 0) return;
          
          const last = msgs[msgs.length - 1];
          if (!last || last.role !== "assistant") return;
          
          if (last.content) markdown = last.content;
          
          if (last.status === "completed") {
            clearTimeout(timer);
            resolve();
          } else if (last.status === "error") {
            clearTimeout(timer);
            reject(new Error("Generation failed"));
          }
        });
      });

      const saved = await base44.entities.PEMeetingBrief.create({
        counterparty_name: formData.name,
        counterparty_type: formData.type,
        primary_url: formData.url,
        additional_urls: extraUrls,
        sectors: formData.sectors,
        role_perspective: formData.role,
        meeting_datetime: formData.datetime || null,
        meeting_context_notes: formData.context,
        brief_markdown: markdown,
        sources_list: [formData.url, ...extraUrls]
      });

      setSelectedId(saved.id);
      queryClient.invalidateQueries(['briefs']);
      toast.success("Brief generated!");
    } catch (err) {
      toast.error(err.message || "Failed to generate brief");
    }
    setGenerating(false);
  };

  const selected = briefs.find(b => b?.id === selectedId);

  return (
    <div className="p-6 md:p-10 max-w-[1800px] mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
          <Briefcase className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-900">PE Meeting Prep</h1>
          <p className="text-slate-600 text-lg mt-1">Generate PE-grade meeting briefs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle>Brief Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Type <span className="text-red-500">*</span></Label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Company">Company</SelectItem>
                    <SelectItem value="Sponsor / PE">Sponsor / PE</SelectItem>
                    <SelectItem value="Lender">Lender</SelectItem>
                    <SelectItem value="Strategic">Strategic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Name <span className="text-red-500">*</span></Label>
                <Input 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Company name"
                />
              </div>

              <div>
                <Label>Website URL <span className="text-red-500">*</span></Label>
                <Input 
                  value={formData.url}
                  onChange={e => setFormData({...formData, url: e.target.value})}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <Label>Additional URLs</Label>
                <Textarea 
                  value={formData.urls}
                  onChange={e => setFormData({...formData, urls: e.target.value})}
                  placeholder="One per line"
                  rows={3}
                />
              </div>

              <div>
                <Label>Sectors</Label>
                <Select value="" onValueChange={v => {
                  if (!formData.sectors.includes(v)) {
                    setFormData({...formData, sectors: [...formData.sectors, v]});
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add sector..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.filter(s => !formData.sectors.includes(s)).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.sectors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.sectors.map(s => (
                      <Badge key={s} variant="secondary" className="cursor-pointer" onClick={() => 
                        setFormData({...formData, sectors: formData.sectors.filter(x => x !== s)})
                      }>
                        {s} <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label>Our Role</Label>
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PE Sponsor">PE Sponsor</SelectItem>
                    <SelectItem value="Growth Equity">Growth Equity</SelectItem>
                    <SelectItem value="Lender">Lender</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Meeting Date</Label>
                <Input 
                  type="datetime-local"
                  value={formData.datetime}
                  onChange={e => setFormData({...formData, datetime: e.target.value})}
                />
              </div>

              <div>
                <Label>Context</Label>
                <Textarea 
                  value={formData.context}
                  onChange={e => setFormData({...formData, context: e.target.value})}
                  placeholder="Meeting objectives..."
                  rows={3}
                />
              </div>

              <Button
                onClick={generate}
                disabled={!canGenerate || generating}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600"
                size="lg"
              >
                {generating ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><FileText className="w-5 h-5 mr-2" />Generate Brief</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Brief
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selected ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No brief selected</p>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
                    <p className="text-xs font-semibold text-indigo-700">
                      {selected.counterparty_name} ({selected.counterparty_type})
                    </p>
                  </div>
                  <ReactMarkdown>{selected.brief_markdown || ""}</ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {briefs.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No briefs yet</p>
              ) : (
                <div className="space-y-2">
                  {briefs.map(b => {
                    if (!b?.id) return null;
                    return (
                      <div
                        key={b.id}
                        className={`p-3 border rounded-lg cursor-pointer transition ${
                          selectedId === b.id ? 'bg-indigo-50 border-indigo-300' : 'hover:bg-slate-50'
                        }`}
                        onClick={() => setSelectedId(b.id)}
                      >
                        <p className="font-semibold text-sm">{b.counterparty_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{b.counterparty_type}</Badge>
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