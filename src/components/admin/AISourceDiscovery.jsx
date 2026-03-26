// DEPRECATED: safe to remove — not imported anywhere in the app
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Plus, Brain } from "lucide-react";
import { toast } from "sonner";

export default function AISourceDiscovery() {
  const [discovering, setDiscovering] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const queryClient = useQueryClient();

  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: () => base44.entities.Source.filter({}),
    initialData: [],
  });

  const discoverNewSources = async () => {
    setDiscovering(true);
    try {
      const activeSources = sources.filter(s => !s.is_deleted);
      
      if (activeSources.length === 0) {
        toast.error("Add some sources first before discovering new ones");
        setDiscovering(false);
        return;
      }

      const sourcesList = activeSources.map(s => 
        `${s.name} (${s.category}) - ${s.url || 'no URL'}`
      ).join('\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are analyzing a healthcare intelligence platform's existing newsletter sources. Based on the patterns below, suggest 10 NEW, high-quality healthcare newsletters/sources that would complement these.

EXISTING SOURCES:
${sourcesList}

REQUIREMENTS:
- Focus on healthcare industry: finance, policy, tech, operations, M&A
- Only suggest real, active newsletters/websites
- Provide exact URLs
- Mix of categories: Investment Banking, Technology, Finance, Operations, Policy
- Prioritize authoritative, professional sources

Return ONLY valid JSON, nothing else.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  url: { type: "string" },
                  category: { 
                    type: "string",
                    enum: ["Investment Banking", "Technology", "Finance", "Operations", "Policy", "General"]
                  },
                  description: { type: "string" },
                  why_relevant: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(result.suggestions || []);
      toast.success(`Found ${result.suggestions?.length || 0} new source suggestions`);
    } catch (error) {
      console.error("Discovery error:", error);
      toast.error(`Failed: ${error.message}`);
    }
    setDiscovering(false);
  };

  const addSource = async (suggestion) => {
    try {
      await base44.entities.Source.create({
        name: suggestion.name,
        url: suggestion.url,
        category: suggestion.category,
        description: suggestion.description,
        is_deleted: false
      });
      
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      setSuggestions(prev => prev.filter(s => s.url !== suggestion.url));
      toast.success(`✓ Added ${suggestion.name} - Go to Admin Dashboard → Source Scraper to fetch its newsletters`);
    } catch (error) {
      toast.error(`Failed to add: ${error.message}`);
    }
  };

  return (
    <Card className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-300">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Source Discovery
          </span>
          <Button 
            onClick={discoverNewSources} 
            disabled={discovering || sources.length === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {discovering ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Discover New Sources
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sources.length === 0 ? (
          <div className="text-center py-6 text-slate-600">
            Add some sources first, then AI will suggest relevant ones to complement your collection.
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-slate-600 mb-2">
              Click "Discover New Sources" to get AI-powered recommendations
            </p>
            <p className="text-xs text-slate-500">
              Based on your {sources.filter(s => !s.is_deleted).length} existing sources
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 mb-4">
              Found {suggestions.length} relevant sources. Click + to add them.
            </p>
            {suggestions.map((suggestion, idx) => (
              <Card key={idx} className="bg-white border-purple-200">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-slate-900">{suggestion.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{suggestion.description}</p>
                      <a 
                        href={suggestion.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {suggestion.url}
                      </a>
                      <p className="text-xs text-slate-500 mt-2 italic">
                        💡 {suggestion.why_relevant}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => addSource(suggestion)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}