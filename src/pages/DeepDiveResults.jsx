import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { generateDeepDive } from "../components/utils/aiAgents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Copy, Loader2, ArrowLeft, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatSummaryAsMarkdown } from "../components/utils/markdownFormatter";
import ReactMarkdown from "react-markdown";

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
          const newsletters = await base44.entities.Newsletter.list("-publication_date", 500);
          const keywords = Array.isArray(topic.keywords) ? topic.keywords : [topic.keywords];
          
          items = newsletters.filter(n => {
            const searchableText = [
              n.title || '',
              n.summary || '',
              n.tldr || '',
              ...(n.key_takeaways || []),
              ...(n.themes?.map(t => t.theme || '') || [])
            ].join(' ').toLowerCase();
            
            return keywords.some(keyword => keyword && searchableText.includes(keyword.toLowerCase()));
          });
        }
      } else if (packId) {
        const packs = await base44.entities.LearningPack.list();
        const pack = packs.find(p => p.id === packId);
        
        if (pack) {
          contextTitle = pack.pack_title;
          const newsletters = await base44.entities.Newsletter.list("-publication_date", 500);
          
          const keywords = pack.keywords ? pack.keywords.split(/\s+/) : [];
          items = newsletters.filter(n => {
            const searchableText = [
              n.title || '',
              n.summary || '',
              n.tldr || ''
            ].join(' ').toLowerCase();
            
            return keywords.length > 0 && keywords.some(keyword => keyword && searchableText.includes(keyword.toLowerCase()));
          });
        }
      }

      setRelevantItems(items);

      if (items.length === 0) {
        toast.error("No matching content found for this pack. Try adjusting the pack keywords.");
        setIsGenerating(false);
        return;
      }

      console.log(`Generating deep dive for: ${contextTitle} with ${items.length} items`);
      
      const result = await generateDeepDive(contextTitle, items);

      if (!result || result.length < 100) {
        throw new Error("Generated content is too short or empty");
      }

      setDeepDive({
        title: contextTitle,
        content: result,
        generatedAt: new Date(),
        itemsAnalyzed: items.length
      });

      toast.success(`Deep dive generated! Analyzed ${items.length} newsletters.`);
    } catch (error) {
      const errorMessage = error?.message || "Failed to generate deep dive";
      toast.error(`Deep dive generation failed: ${errorMessage}`);
      console.error("Deep dive error details:", error);
      setDeepDive(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const parseSections = (content) => {
    const sections = {
      executive: "",
      overview: "",
      drivers: "",
      landscape: "",
      timeline: "",
      highlights: "",
      excerpts: "",
      summary: ""
    };

    const lines = content.split('\n');
    let currentSection = null;
    let sectionContent = [];

    for (const line of lines) {
      if (line.match(/^##\s+Executive Summary/i) || line.match(/^\*\*Executive Summary\*\*/i)) {
        if (currentSection && sectionContent.length) {
          sections[currentSection] = sectionContent.join('\n');
        }
        currentSection = 'executive';
        sectionContent = [];
      } else if (line.match(/^##\s+Market Overview/i) || line.match(/^\*\*Market Overview\*\*/i)) {
        if (currentSection && sectionContent.length) {
          sections[currentSection] = sectionContent.join('\n');
        }
        currentSection = 'overview';
        sectionContent = [];
      } else if (line.match(/^##\s+Outreach Recommendations/i) || line.match(/^\*\*Outreach Recommendations/i)) {
        if (currentSection && sectionContent.length) {
          sections[currentSection] = sectionContent.join('\n');
        }
        currentSection = 'drivers';
        sectionContent = [];
      } else if (line.match(/^##\s+BD Pipeline Applications/i) || line.match(/^\*\*BD Pipeline Applications/i)) {
        if (currentSection && sectionContent.length) {
          sections[currentSection] = sectionContent.join('\n');
        }
        currentSection = 'landscape';
        sectionContent = [];
      } else if (line.match(/^##\s+Mini Email Templates/i) || line.match(/^\*\*Mini Email Templates/i)) {
        if (currentSection && sectionContent.length) {
          sections[currentSection] = sectionContent.join('\n');
        }
        currentSection = 'timeline';
        sectionContent = [];
      } else if (line.match(/^##\s+Thought Leadership/i) || line.match(/^\*\*Thought Leadership/i)) {
        if (currentSection && sectionContent.length) {
          sections[currentSection] = sectionContent.join('\n');
        }
        currentSection = 'highlights';
        sectionContent = [];
      } else if (line.match(/^##\s+Collateral Creation/i) || line.match(/^\*\*Collateral Creation/i)) {
        if (currentSection && sectionContent.length) {
          sections[currentSection] = sectionContent.join('\n');
        }
        currentSection = 'excerpts';
        sectionContent = [];
      } else if (line.match(/^##\s+(Consolidated Action Plan|Valuation Tie-Ins)/i) || line.match(/^\*\*(Consolidated Action Plan|Valuation Tie-Ins)/i)) {
        if (currentSection && sectionContent.length) {
          sections[currentSection] = sectionContent.join('\n');
        }
        currentSection = 'summary';
        sectionContent = [];
      } else if (currentSection) {
        sectionContent.push(line);
      }
    }

    if (currentSection && sectionContent.length) {
      sections[currentSection] = sectionContent.join('\n');
    }

    return sections;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(deepDive.content);
      toast.success("Copied to clipboard!");
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Failed to copy");
    }
  };

  const downloadMarkdown = async () => {
    try {
      const sourcesList = relevantItems.map(n => {
        const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
        const sourceUrl = n.source_url ? ` - [View Source](${n.source_url})` : '';
        return `- **${n.title}** – ${n.source_name} (${format(pubDate, "MMM d, yyyy")})${sourceUrl}`;
      }).join('\n');

      const markdown = `# Deep Dive: ${deepDive.title}

**Generated:** ${format(deepDive.generatedAt, "MMMM d, yyyy 'at' h:mm a")}
**Items Analyzed:** ${deepDive.itemsAnalyzed}

---

${deepDive.content}

---

## Sources Analyzed (${relevantItems.length})

${sourcesList}
`;

      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deep-dive-${deepDive.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download");
    }
  };

  if (isGenerating) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <Card className="text-center py-16">
          <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">Generating Deep Dive</h3>
          <p className="text-slate-500">Analyzing newsletter content and creating research briefing...</p>
        </Card>
      </div>
    );
  }

  if (!deepDive) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <Card className="text-center py-16">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Deep Dive Data</h3>
          <p className="text-slate-500">Unable to generate deep dive report</p>
        </Card>
      </div>
    );
  }

  const sections = parseSections(deepDive.content);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
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
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
          <Button onClick={downloadMarkdown}>
            <Download className="w-4 h-4 mr-2" />
            Export Markdown
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="executive">Summary</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="drivers">Outreach</TabsTrigger>
          <TabsTrigger value="landscape">Pipeline</TabsTrigger>
          <TabsTrigger value="timeline">Templates</TabsTrigger>
          <TabsTrigger value="highlights">Marketing</TabsTrigger>
          <TabsTrigger value="excerpts">Collateral</TabsTrigger>
          <TabsTrigger value="summary">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardContent className="pt-6">
              <ReactMarkdown className="prose prose-slate max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-strong:text-slate-900 prose-strong:font-semibold">
                {deepDive.content}
              </ReactMarkdown>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executive">
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactMarkdown className="prose prose-slate max-w-none prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-strong:font-semibold">
                {sections.executive}
              </ReactMarkdown>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Market Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactMarkdown className="prose prose-slate max-w-none prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-strong:font-semibold prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2">
                {sections.overview}
              </ReactMarkdown>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers">
          <Card>
            <CardHeader>
              <CardTitle>Outreach Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactMarkdown className="prose prose-slate max-w-none prose-li:text-slate-700 prose-li:my-2 prose-strong:text-slate-900 prose-strong:font-semibold">
                {sections.drivers}
              </ReactMarkdown>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="landscape">
          <Card>
            <CardHeader>
              <CardTitle>BD Pipeline Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactMarkdown className="prose prose-slate max-w-none prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2 prose-li:text-slate-700 prose-strong:text-slate-900 prose-strong:font-semibold">
                {sections.landscape}
              </ReactMarkdown>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Mini Email Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactMarkdown className="prose prose-slate max-w-none prose-li:text-slate-700 prose-li:my-1 prose-strong:text-slate-900 prose-strong:font-semibold">
                {sections.timeline}
              </ReactMarkdown>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="highlights">
          <Card>
            <CardHeader>
              <CardTitle>Thought Leadership & Marketing</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactMarkdown className="prose prose-slate max-w-none prose-li:text-slate-700 prose-li:my-2 prose-strong:text-slate-900 prose-strong:font-semibold prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2">
                {sections.highlights}
              </ReactMarkdown>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="excerpts">
          <Card>
            <CardHeader>
              <CardTitle>Collateral Creation Priorities</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactMarkdown className="prose prose-slate max-w-none prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-strong:font-semibold prose-li:my-2">
                {sections.excerpts}
              </ReactMarkdown>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Consolidated Action Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactMarkdown className="prose prose-slate max-w-none prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-strong:font-semibold">
                {sections.summary}
              </ReactMarkdown>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sources Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Sources Analyzed ({relevantItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {relevantItems.map((item) => {
              const pubDate = item.publication_date 
                ? new Date(item.publication_date) 
                : new Date(item.created_date);
              
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
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium ml-4"
                    >
                      View Source
                      <ExternalLink className="w-4 h-4" />
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