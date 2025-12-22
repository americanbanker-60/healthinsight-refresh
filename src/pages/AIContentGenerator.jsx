import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Download, Copy } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const categories = ["Investment Banking", "Technology", "Finance", "Operations", "Policy", "General", "Other"];

export default function AIContentGenerator() {
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [contentType, setContentType] = useState("summary");
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: () => base44.entities.Source.filter({}),
    initialData: [],
  });

  const { data: newsletters = [] } = useQuery({
    queryKey: ['newsletters'],
    queryFn: () => base44.entities.Newsletter.list('-publication_date', 100),
    initialData: [],
  });

  const activeSources = sources.filter(s => !s.is_deleted);

  const toggleSource = (sourceId) => {
    setSelectedSources(prev => 
      prev.includes(sourceId) ? prev.filter(id => id !== sourceId) : [...prev, sourceId]
    );
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const generateContent = async () => {
    if (selectedSources.length === 0 && selectedCategories.length === 0) {
      toast.error("Select at least one source or category");
      return;
    }

    setGenerating(true);
    try {
      const filteredNewsletters = newsletters.filter(n => {
        const sourceMatch = selectedSources.length === 0 || selectedSources.includes(n.source_name);
        const source = sources.find(s => s.name === n.source_name);
        const categoryMatch = selectedCategories.length === 0 || (source && selectedCategories.includes(source.category));
        return sourceMatch && categoryMatch;
      }).slice(0, 20);

      if (filteredNewsletters.length === 0) {
        toast.error("No newsletters found for selected sources/categories");
        setGenerating(false);
        return;
      }

      const newsletterSummaries = filteredNewsletters.map(n => 
        `**${n.title}** (${n.source_name}, ${new Date(n.publication_date).toLocaleDateString()})
${n.tldr || n.summary || 'No summary available'}`
      ).join('\n\n---\n\n');

      const contentTypePrompts = {
        summary: `Create a comprehensive executive summary of the healthcare industry trends based on these recent newsletters. Focus on key developments, major deals, and strategic insights.`,
        trends: `Analyze these newsletters and identify the top 5-7 emerging trends in healthcare. For each trend, provide evidence from the newsletters, explain its significance, and potential impact.`,
        article: `Write a professional article (800-1000 words) for healthcare executives based on these newsletters. Include an engaging headline, introduction, body sections with data/examples, and conclusion with actionable insights.`,
        report: `Generate a detailed strategic report for healthcare decision-makers. Include: Executive Summary, Market Overview, Key Developments, Data & Statistics, Strategic Implications, and Recommendations.`
      };

      const prompt = `${contentTypePrompts[contentType]}

${additionalInstructions ? `Additional Requirements: ${additionalInstructions}\n\n` : ''}

Based on ${filteredNewsletters.length} newsletters from: ${[...new Set(filteredNewsletters.map(n => n.source_name))].join(', ')}

NEWSLETTER DATA:
${newsletterSummaries}

Return professional, well-structured content in markdown format.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setGeneratedContent(result);
      toast.success("Content generated successfully!");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(`Failed: ${error.message}`);
    }
    setGenerating(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success("Copied to clipboard");
  };

  const downloadContent = () => {
    const blob = new Blob([generatedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healthcare-${contentType}-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">AI Content Generator</h1>
        <p className="text-slate-600 text-lg">Generate summaries, articles, and reports from your newsletter sources</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Executive Summary</SelectItem>
                  <SelectItem value="trends">Trend Analysis</SelectItem>
                  <SelectItem value="article">Article (800-1000 words)</SelectItem>
                  <SelectItem value="report">Strategic Report</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categories.map(category => (
                  <div key={category} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => toggleCategory(category)}
                    />
                    <label className="text-sm">{category}</label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select Sources ({selectedSources.length} selected)</CardTitle>
            </CardHeader>
            <CardContent className="max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {activeSources.map(source => (
                  <div key={source.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedSources.includes(source.name)}
                      onCheckedChange={() => toggleSource(source.name)}
                    />
                    <label className="text-sm flex-1">{source.name}</label>
                    <Badge variant="outline" className="text-xs">{source.category}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Instructions (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="E.g., Focus on M&A activity, include specific metrics, target audience is CFOs..."
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          <Button
            onClick={generateContent}
            disabled={generating}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Content
              </>
            )}
          </Button>
        </div>

        {/* Generated Content Panel */}
        <Card className="lg:sticky lg:top-6 lg:self-start">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Generated Content</span>
              {generatedContent && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={copyToClipboard}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadContent}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!generatedContent ? (
              <div className="text-center py-12 text-slate-500">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>Configure your content settings and click Generate Content</p>
              </div>
            ) : (
              <div className="prose prose-slate max-w-none">
                <ReactMarkdown>{generatedContent}</ReactMarkdown>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}