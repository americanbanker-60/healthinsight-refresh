import React, { useState } from "react";
import { generateCompanyOverview } from "../utils/aiAgents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function CompanyOverview({ company, relevantNewsletters }) {
  const [overview, setOverview] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const generateOverview = async () => {
    if (relevantNewsletters.length === 0) {
      toast.error("No content available to generate overview");
      return;
    }

    setIsGenerating(true);

    try {
      const result = await generateCompanyOverview(company.company_name, relevantNewsletters);

      setOverview(result);
      setIsExpanded(true);
      toast.success("Overview generated!");
    } catch (error) {
      toast.error("Failed to generate overview");
      console.error(error);
    }

    setIsGenerating(false);
  };

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Company Overview
          </CardTitle>
          {overview && (
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
        {!overview ? (
          <div className="text-center py-4">
            <p className="text-slate-600 text-sm mb-4">
              Generate an AI-powered overview based on newsletter mentions
            </p>
            <Button
              onClick={generateOverview}
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
                  Generate Overview
                </>
              )}
            </Button>
          </div>
        ) : (
          isExpanded && (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm font-sans text-slate-700 bg-white/60 p-4 rounded-lg">
                {overview}
              </pre>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}