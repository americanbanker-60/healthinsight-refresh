import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Download, Copy, Save, ThumbsUp, ThumbsDown, Star } from "lucide-react";
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
  const [autoSummaries, setAutoSummaries] = useState([]);
  const [showRating, setShowRating] = useState(false);
  const queryClient = useQueryClient();

  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: async () => {
      const allSources = await base44.entities.Source.list("name");
      return allSources.filter(s => !s.is_deleted);
    },
    initialData: [],
  });

  const { data: newsletters = [] } = useQuery({
    queryKey: ['newsletters'],
    queryFn: () => base44.entities.Newsletter.list('-publication_date', 100),
    initialData: [],
  });

  const { data: preferences = [] } = useQuery({
    queryKey: ['aiPreferences'],
    queryFn: () => base44.entities.AIContentPreference.list('-created_date', 50),
    initialData: [],
  });

  const trackPreference = useMutation({
    mutationFn: (data) => base44.entities.AIContentPreference.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiPreferences'] });
    },
  });

  const activeSources = sources;

  const toggleSource = (sourceId) => {
    setSelectedSources(prev => 
      prev.includes(sourceId) ? prev.filter(id => id !== sourceId) : [...prev, sourceId]
    );
  };

  // Auto-generate summaries when sources change
  React.useEffect(() => {
    if (selectedSources.length > 0 || selectedCategories.length > 0) {
      autoGenerateSummaries();
    } else {
      setAutoSummaries([]);
    }
  }, [selectedSources, selectedCategories]);

  const autoGenerateSummaries = async () => {
    const filteredNewsletters = newsletters.filter(n => {
      const sourceMatch = selectedSources.length === 0 || selectedSources.includes(n.source_name);
      const source = sources.find(s => s.name === n.source_name);
      const categoryMatch = selectedCategories.length === 0 || (source && selectedCategories.includes(source.category));
      return sourceMatch && categoryMatch;
    }).slice(0, 10);

    if (filteredNewsletters.length === 0) {
      setAutoSummaries([]);
      return;
    }

    const summaries = filteredNewsletters.map(n => ({
      id: n.id,
      title: n.title,
      source: n.source_name,
      date: n.publication_date,
      summary: n.tldr || n.summary || 'No summary available',
      url: n.source_url
    }));

    setAutoSummaries(summaries);
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const getPersonalizedPrompt = () => {
    const savedPrefs = preferences.filter(p => p.action_taken === 'saved' || p.action_taken === 'downloaded');
    const favoriteContentTypes = savedPrefs.reduce((acc, p) => {
      acc[p.content_type] = (acc[p.content_type] || 0) + 1;
      return acc;
    }, {});
    
    const favoriteSources = savedPrefs.flatMap(p => p.sources_used || [])
      .reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});
    
    const topSources = Object.entries(favoriteSources)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source]) => source);

    if (topSources.length > 0) {
      return `\nBased on your preferences, prioritize insights from: ${topSources.join(', ')}.`;
    }
    return '';
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

      const personalizedContext = getPersonalizedPrompt();

      const prompt = `${contentTypePrompts[contentType]}

${additionalInstructions ? `Additional Requirements: ${additionalInstructions}\n\n` : ''}${personalizedContext}

Based on ${filteredNewsletters.length} newsletters from: ${[...new Set(filteredNewsletters.map(n => n.source_name))].join(', ')}

NEWSLETTER DATA:
${newsletterSummaries}

Return professional, well-structured content in markdown format.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setGeneratedContent(result);
      setShowRating(true);
      toast.success("Content generated successfully!");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(`Failed: ${error.message}`);
    }
    setGenerating(false);
  };

  const handleAction = async (action, rating = null) => {
    await trackPreference.mutateAsync({
      content_type: contentType,
      sources_used: selectedSources,
      categories_used: selectedCategories,
      action_taken: action,
      content_preview: generatedContent.substring(0, 500),
      rating: rating
    });
    
    if (action === 'saved') {
      toast.success("Saved! AI will prioritize similar content.");
    } else if (action === 'discarded') {
      toast.info("Noted. AI will adjust future recommendations.");
    }
    setShowRating(false);
  };

  const copyToClipboard = async () => {
    navigator.clipboard.writeText(generatedContent);
    await handleAction('copied');
    toast.success("Copied to clipboard");
  };

  const downloadContent = async () => {
    const blob = new Blob([generatedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healthcare-${contentType}-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    await handleAction('downloaded');
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-6">
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

        {/* Auto-Generated Summaries & Content Panel */}
        <div className="space-y-6">
          {/* Auto Summaries */}
          {autoSummaries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  Auto-Generated Summaries ({autoSummaries.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                {autoSummaries.map((item) => (
                  <Card key={item.id} className="bg-blue-50/50 border-blue-200">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-sm text-slate-900 flex-1">{item.title}</h4>
                        <Badge variant="outline" className="text-xs shrink-0">{item.source}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">
                        {new Date(item.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-slate-700">{item.summary}</p>
                      {item.url && (
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                        >
                          Read full article →
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Generated Content */}
          <Card className="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>AI-Generated Content</span>
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
                  <p className="text-sm">Select sources above to see auto-summaries</p>
                  <p className="text-xs mt-2">Or click Generate Content for detailed analysis</p>
                  {preferences.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs">
                      <p className="font-semibold text-blue-900">🎯 Personalization Active</p>
                      <p className="text-blue-700 mt-1">AI learning from your {preferences.length} past interactions</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {showRating && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                      <p className="text-sm font-semibold text-slate-900 mb-3">How useful is this content?</p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAction('saved', 5)} className="bg-green-600 hover:bg-green-700">
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          Great
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleAction('saved', 3)}>
                          <Save className="w-4 h-4 mr-1" />
                          Good
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleAction('discarded', 1)}>
                          <ThumbsDown className="w-4 h-4 mr-1" />
                          Not Useful
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Your feedback helps AI generate better content for you</p>
                    </div>
                  )}
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({children}) => <h1 className="text-3xl font-bold mb-8 mt-12 first:mt-0">{children}</h1>,
                        h2: ({children}) => <h2 className="text-2xl font-bold mb-6 mt-10">{children}</h2>,
                        h3: ({children}) => <h3 className="text-xl font-semibold mb-5 mt-8">{children}</h3>,
                        h4: ({children}) => <h4 className="text-lg font-semibold mb-4 mt-6">{children}</h4>,
                        p: ({children}) => <p className="mb-5 leading-[1.75] text-slate-700">{children}</p>,
                        ul: ({children}) => <ul className="my-6 ml-6 space-y-3 list-disc marker:text-slate-400">{children}</ul>,
                        ol: ({children}) => <ol className="my-6 ml-6 space-y-3 list-decimal marker:text-slate-400">{children}</ol>,
                        li: ({children}) => <li className="pl-2 leading-[1.75] text-slate-700">{children}</li>,
                        blockquote: ({children}) => <blockquote className="my-8 pl-6 border-l-4 border-slate-300 italic text-slate-600">{children}</blockquote>,
                        strong: ({children}) => <strong className="font-semibold text-slate-900">{children}</strong>,
                        hr: () => <hr className="my-10 border-slate-200" />,
                      }}
                    >
                      {generatedContent}
                    </ReactMarkdown>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}