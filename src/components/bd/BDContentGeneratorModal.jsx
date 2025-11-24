import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Copy, Download, Mail, FileText, Sparkles, Check, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const contentTypes = {
  pitch_angle: {
    label: "Pitch Angle",
    icon: Sparkles,
    description: "A compelling angle to approach prospects"
  },
  intro_email: {
    label: "Intro Email",
    icon: Mail,
    description: "Cold outreach email to a target"
  },
  follow_up: {
    label: "Follow-Up Email",
    icon: Mail,
    description: "Follow-up on previous conversation"
  },
  talking_points: {
    label: "Talking Points",
    icon: FileText,
    description: "Key points for a call or meeting"
  }
};

export default function BDContentGeneratorModal({ 
  open, 
  onClose, 
  contextType, // "newsletter" | "topic" | "company" | "deal"
  contextData // { title, summary, companies, deals, etc. }
}) {
  const [contentType, setContentType] = useState("pitch_angle");
  const [additionalContext, setAdditionalContext] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateContent = async () => {
    setIsGenerating(true);
    setGeneratedContent("");

    try {
      const prompt = buildPrompt(contentType, contextType, contextData, additionalContext);
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            content: { type: "string", description: "The generated content in markdown format" },
            subject_line: { type: "string", description: "Email subject line if applicable" }
          },
          required: ["content"]
        }
      });

      let output = response.content;
      if (response.subject_line && (contentType === "intro_email" || contentType === "follow_up")) {
        output = `**Subject:** ${response.subject_line}\n\n${output}`;
      }
      
      setGeneratedContent(output);
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const buildPrompt = (type, ctxType, data, additional) => {
    const baseContext = `
You are a business development expert at an investment bank or advisory firm. 
You are writing outreach content to potential clients, targets, or contacts.
Your tone should be professional, knowledgeable, and compelling without being pushy.

CONTEXT TYPE: ${ctxType}
CONTEXT DATA:
- Title/Name: ${data.title || data.name || "N/A"}
- Summary: ${data.summary || data.description || "N/A"}
- Key Companies: ${data.companies?.join(", ") || "N/A"}
- Deal Activity: ${data.deals || "N/A"}
- Key Themes: ${data.themes?.join(", ") || "N/A"}
${additional ? `\nADDITIONAL CONTEXT FROM USER: ${additional}` : ""}

CRITICAL FORMATTING RULES FOR WORD EXPORT:
1. ALWAYS put TWO newlines (a blank line) between EVERY paragraph
2. ALWAYS put TWO newlines before and after EVERY header (##, ###)
3. ALWAYS put TWO newlines before and after EVERY bullet list
4. Keep paragraphs SHORT - 2-3 sentences maximum
5. Use markdown headers with ## or ### for sections
6. Separate bullet points with a blank line between them for readability
7. Think of this as a Word document - generous spacing is ESSENTIAL

Example of correct formatting:

## Section Header

First paragraph goes here. Keep it short and punchy.

Second paragraph with more detail. Still concise.

### Subsection

- Bullet point one

- Bullet point two

- Bullet point three

Another paragraph after the list.
`;

    const typePrompts = {
      pitch_angle: `
${baseContext}

Generate a compelling PITCH ANGLE that I can use to approach prospects related to this intelligence.

Structure your response EXACTLY like this (with blank lines as shown):

## The Hook

A compelling opening paragraph that grabs attention. Keep it to 2-3 sentences.

## Why Now

The timing/urgency paragraph. What makes this moment critical?

Add another paragraph if needed for emphasis.

## Our Value

How our services could help them capitalize or respond. Be specific.

## The Ask

A soft call-to-action. What's the next step?

REMEMBER: Put a blank line between EVERY paragraph and before/after EVERY header.`,

      intro_email: `
${baseContext}

Write a cold INTRO EMAIL to a decision-maker at a relevant company.

Format it EXACTLY like this:

**Subject:** [Compelling subject line]

Dear [Title/Name],

Opening paragraph - something relevant to THEM, not about us.

Middle paragraph - reference the market intelligence naturally.

Brief mention of how we could help.

Soft close with a low-friction ask (15-min call).

Best regards,
[Your Name]

Keep it under 150 words. Be human, not salesy. PUT BLANK LINES BETWEEN EVERY PARAGRAPH.`,

      follow_up: `
${baseContext}

Write a FOLLOW-UP EMAIL for someone I've previously contacted about this topic.

Format it EXACTLY like this:

**Subject:** [Re: Previous topic or new angle]

Hi [Name],

Opening - reference the previous conversation naturally.

New insight paragraph - share value, not an ask.

Optional: Another supporting point.

Soft close with gentle next steps.

Best,
[Your Name]

Keep it under 100 words. PUT BLANK LINES BETWEEN EVERY PARAGRAPH.`,

      talking_points: `
${baseContext}

Create TALKING POINTS for a call or meeting about this topic.

Format it EXACTLY like this:

## Opening Hook

- Conversation starter point one

- Conversation starter point two

## Key Market Insights

- Insight 1: Brief explanation

- Insight 2: Brief explanation

- Insight 3: Brief explanation

## Discovery Questions

- Question to understand their situation?

- Question about their priorities?

## Transition to Services

- Natural bridge to mentioning capabilities

## Handling Objections

- **Objection 1:** Response approach

- **Objection 2:** Response approach

PUT BLANK LINES BETWEEN EVERY BULLET POINT AND SECTION.`
    };

    return typePrompts[type] || typePrompts.pitch_angle;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([generatedContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${contentTypes[contentType].label.toLowerCase().replace(" ", "-")}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded as markdown file");
  };

  const handleClose = () => {
    setGeneratedContent("");
    setAdditionalContext("");
    setContentType("pitch_angle");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Generate BD Content
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Context Preview */}
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-3">
              <p className="text-xs text-slate-500 mb-1">Based on:</p>
              <p className="text-sm font-medium text-slate-900">
                {contextData?.title || contextData?.name || "Current content"}
              </p>
            </CardContent>
          </Card>

          {/* Content Type Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">What do you want to create?</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(contentTypes).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <config.icon className="w-4 h-4" />
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              {contentTypes[contentType].description}
            </p>
          </div>

          {/* Additional Context */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Additional context (optional)</Label>
            <Textarea
              placeholder="E.g., 'Focus on PE firms', 'Target CFOs', 'Mention our recent deal in this space'..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={2}
            />
          </div>

          {/* Generate Button */}
          <Button 
            onClick={generateContent} 
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : generatedContent ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate {contentTypes[contentType].label}
              </>
            )}
          </Button>

          {/* Generated Content */}
          {generatedContent && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Generated Content</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
              <Card className="bg-white border-slate-200">
                <CardContent className="p-5">
                  <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-headings:font-semibold prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3 prose-h2:pb-1 prose-h2:border-b prose-h2:border-slate-200 prose-h3:text-sm prose-h3:mt-5 prose-h3:mb-2 prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-4 prose-li:text-slate-700 prose-li:mb-2 prose-ul:mb-4 prose-ul:mt-2 prose-strong:text-slate-900 [&_ul]:space-y-2 [&_ol]:space-y-2">
                    <ReactMarkdown>{generatedContent}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}