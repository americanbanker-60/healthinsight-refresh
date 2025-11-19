import React, { useState } from "react";
import { generateGetSmartFast } from "../utils/aiAgents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function TopicQuickSummary({ topic, relevantNewsletters }) {
  const [summary, setSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const generateQuickSummary = async () => {
    if (relevantNewsletters.length === 0) {
      toast.error("No content available to summarize");
      return;
    }

    setIsGenerating(true);

    try {
      const result = await generateGetSmartFast(topic.topic_name, relevantNewsletters);

      setSummary(result);
      setIsExpanded(true);
      toast.success("Summary generated!");
    } catch (error) {
      toast.error("Failed to generate summary");
      console.error(error);
    }

    setIsGenerating(false);
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Quick Summary
          </CardTitle>
          {summary && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!summary ? (
          <div className="text-center py-4">
            <p className="text-slate-600 text-sm mb-4">
              Get a 60-second AI-powered briefing on this topic
            </p>
            <Button
              onClick={generateQuickSummary}
              disabled={isGenerating}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get Smart Fast
                </>
              )}
            </Button>
          </div>
        ) : (
          isExpanded && (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm font-sans text-slate-700 bg-white/60 p-4 rounded-lg">
                {summary}
              </pre>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}