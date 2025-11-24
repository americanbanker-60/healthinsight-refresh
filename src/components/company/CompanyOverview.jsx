import React, { useState } from "react";
import { generateCompanyOverview } from "../utils/aiAgents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ChevronDown, ChevronUp, Copy, Download, Check, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function CompanyOverview({ company, relevantNewsletters }) {
  const [overview, setOverview] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(overview);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    // Format for Word-compatible export with proper line breaks
    const formattedContent = `# Company Overview: ${company.company_name}

Generated: ${format(new Date(), "MMMM d, yyyy")}

---

${overview}

---

*This overview was generated based on ${relevantNewsletters.length} newsletter mentions.*
`;
    
    const blob = new Blob([formattedContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${company.company_name.replace(/\s+/g, "-")}-Overview-${format(new Date(), "yyyy-MM-dd")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded as markdown file");
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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={generateOverview} disabled={isGenerating}>
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
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
            <div className="bg-white/60 p-5 rounded-lg border border-slate-200">
              <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-headings:font-semibold prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2 prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-4 prose-li:text-slate-700 prose-li:mb-1 prose-ul:mb-4 prose-strong:text-slate-900">
                <ReactMarkdown>{overview}</ReactMarkdown>
              </div>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}