import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { generateDeepDive } from "../components/utils/aiAgents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Copy, Loader2, ArrowLeft, ExternalLink, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";

// Renders a string paragraph or an array of bullets
function SectionContent({ value }) {
  if (!value) return <p className="text-slate-400 italic">No content generated for this section.</p>;

  if (Array.isArray(value)) {
    return (
      <ul className="space-y-2">
        {value.map((item, i) => {
          // email_templates items are objects with subject/body
          if (item && typeof item === "object") {
            return (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-3">
                <p className="font-semibold text-slate-800 mb-1">Subject: {item.subject}</p>
                <p className="text-slate-700 whitespace-pre-wrap">{item.body}</p>
              </div>
            );
          }
          return (
            <li key={i} className="flex gap-2 text-slate-700">
              <span className="text-blue-500 font-bold mt-1 shrink-0">•</span>
              <span>{item}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  return <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{value}</p>;
}

export default function DeepDiveResults() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get('topic_id');
  const packId = urlParams.get('pack_id');
  const title = urlParams.get('title');

  const [deepDive, setDeepDive] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [relevantItems, setRelevantItems] = useState([]);

  useEffect(() => {
    if (topicId || packId) {
      generateDeepDiveReport();
    }
  }, []);

  const generateDeepDiveReport = async () => {
    setIsGenerating(true);
    try {
      let items = [];
      let contextTitle = title || "Research Topic";

      if (topicId) {
        const topics = await base44.entities.Topic.list();
        const topic = topics.find(t => t.id === topicId);
        if (topic) {
          contextTitle = topic.topic_name;
          const newsletters = await base44.entities.NewsletterItem.list("-publication_date", 500);
          const keywords = Array.isArray(topic.keywords) ? topic.keywords : [topic.keywords];
          items = newsletters.filter(n => {
            const searchableText = [
              n.title || '', n.summary || '', n.tldr || '',
              ...(n.key_takeaways || []),
              ...(n.themes?.map(t => t.theme || '') || [])
            ].join(' ').toLowerCase();
            return keywords.some(kw => kw && searchableText.includes(kw.toLowerCase()));
          });
        }
      } else if (packId) {
        const packs = await base44.entities.LearningPack.list();
        const pack = packs.find(p => p.id === packId);
        if (pack) {
          contextTitle = pack.pack_title;
          const newsletters = await base44.entities.NewsletterItem.list("-publication_date", 500);
          const keywords = pack.keywords ? pack.keywords.split(/\s+/) : [];
          items = newsletters.filter(n => {
            const searchableText = [n.title || '', n.summary || '', n.tldr || ''].join(' ').toLowerCase();
            return keywords.length > 0 && keywords.some(kw => kw && searchableText.includes(kw.toLowerCase()));
          });
        }
      }

      setRelevantItems(items);

      if (items.length === 0) {
        toast.error("No matching content found for this pack. Try adjusting the pack keywords.");
        setIsGenerating(false);
        return;
      }

      const result = await generateDeepDive(contextTitle, items);

      // result is now a structured JSON object
      if (!result || typeof result !== 'object' || !result.executive_summary) {
        throw new Error("Generated content is missing required sections");
      }

      setDeepDive({
        title: contextTitle,
        sections: result,
        generatedAt: new Date(),
        itemsAnalyzed: items.length
      });

      toast.success(`Deep dive generated! Analyzed ${items.length} newsletters.`);
    } catch (error) {
      toast.error(`Deep dive generation failed: ${error?.message || "Unknown error"}`);
      console.error("Deep dive error:", error);
      setDeepDive(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const buildMarkdownExport = () => {
    if (!deepDive) return '';
    const s = deepDive.sections;
    const arrToMd = (arr) => Array.isArray(arr) ? arr.map(i => `- ${i}`).join('\n') : (arr || '');
    const templatesToMd = (arr) => Array.isArray(arr)
      ? arr.map((t, i) => `### Template ${i + 1}\n**Subject:** ${t.subject}\n\n${t.body}`).join('\n\n')
      : '';

    return `# Deep Dive: ${deepDive.title}

**Generated:** ${format(deepDive.generatedAt, "MMMM d, yyyy 'at' h:mm a")}
**Items Analyzed:** ${deepDive.itemsAnalyzed}

---

## Executive Summary

${s.executive_summary}

## Market Overview

${s.market_overview}

## Outreach Recommendations

${arrToMd(s.outreach_recommendations)}

## BD Pipeline Applications

${arrToMd(s.bd_pipeline_applications)}

## Mini Email Templates

${templatesToMd(s.email_templates)}

## Thought Leadership & Marketing

${arrToMd(s.thought_leadership)}

## Collateral Creation Priorities

${arrToMd(s.collateral_priorities)}

## Valuation Tie-Ins

${arrToMd(s.valuation_tie_ins)}

## Consolidated Action Plan

${s.consolidated_action_plan}

---

## Sources Analyzed (${relevantItems.length})

${relevantItems.map(n => {
  const d = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
  return `- **${n.title}** – ${n.source_name} (${format(d, "MMM d, yyyy")})${n.source_url ? ` - ${n.source_url}` : ''}`;
}).join('\n')}
`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdownExport());
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const downloadMarkdown = () => {
    try {
      const blob = new Blob([buildMarkdownExport()], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deep-dive-${deepDive.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Downloaded!");
    } catch {
      toast.error("Failed to download");
    }
  };

  if (isGenerating) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <Card className="text-center py-16">
          <CardContent>
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Generating Deep Dive</h3>
            <p className="text-slate-500">Analyzing newsletter content and creating research briefing...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!deepDive) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <Card className="text-center py-16">
          <CardContent>
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Deep Dive Data</h3>
            <p className="text-slate-500">Unable to generate deep dive report</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const s = deepDive.sections;

  const TABS = [
    { value: "executive",  label: "Summary",    title: "Executive Summary",           key: "executive_summary" },
    { value: "overview",   label: "Overview",   title: "Market Overview",             key: "market_overview" },
    { value: "outreach",   label: "Outreach",   title: "Outreach Recommendations",    key: "outreach_recommendations" },
    { value: "pipeline",   label: "Pipeline",   title: "BD Pipeline Applications",    key: "bd_pipeline_applications" },
    { value: "emails",     label: "Templates",  title: "Mini Email Templates",        key: "email_templates" },
    { value: "marketing",  label: "Marketing",  title: "Thought Leadership & Marketing", key: "thought_leadership" },
    { value: "collateral", label: "Collateral", title: "Collateral Creation Priorities", key: "collateral_priorities" },
    { value: "valuation",  label: "Valuation",  title: "Valuation Tie-Ins",           key: "valuation_tie_ins" },
    { value: "actions",    label: "Actions",    title: "Consolidated Action Plan",    key: "consolidated_action_plan" },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Deep Dive: {deepDive.title}</h1>
            <p className="text-sm text-slate-600 mt-1">
              Generated {format(deepDive.generatedAt, "MMM d, yyyy 'at' h:mm a")} • {deepDive.itemsAnalyzed} items analyzed
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyToClipboard}>
            <Copy className="w-4 h-4 mr-2" />Copy
          </Button>
          <Button onClick={downloadMarkdown}>
            <Download className="w-4 h-4 mr-2" />Export Markdown
          </Button>
        </div>
      </div>

      <Tabs defaultValue="executive" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All</TabsTrigger>
          {TABS.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>

        {/* All sections */}
        <TabsContent value="all">
          <div className="space-y-6">
            {TABS.map(tab => (
              <Card key={tab.value}>
                <CardHeader>
                  <CardTitle>{tab.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <SectionContent value={s[tab.key]} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Individual section tabs */}
        {TABS.map(tab => (
          <TabsContent key={tab.value} value={tab.value}>
            <Card>
              <CardHeader><CardTitle>{tab.title}</CardTitle></CardHeader>
              <CardContent>
                <SectionContent value={s[tab.key]} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Sources */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Sources Analyzed ({relevantItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {relevantItems.map((item) => {
              const pubDate = item.publication_date ? new Date(item.publication_date) : new Date(item.created_date);
              return (
                <div key={item.id} className="flex items-start justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 mb-1">{item.title}</h4>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <span>{item.source_name}</span>
                      <span>•</span>
                      <span>{format(pubDate, "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  {item.source_url && (
                    <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium ml-4">
                      View Source <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}