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

CRITICAL FORMATTING RULES:
- Use TWO line breaks between paragraphs (blank line between each paragraph)
- Use headers (##, ###) to separate major sections
- Use bullet points or numbered lists where appropriate
- Keep paragraphs short (2-3 sentences max)
- Add a blank line before and after lists
- Add a blank line before and after headers
`;

    const typePrompts = {
      pitch_angle: `
${baseContext}

Generate a compelling PITCH ANGLE that I can use to approach prospects related to this intelligence.

Structure your response with these sections (use ### headers):

### The Hook
A compelling opening that grabs attention

### Why Now
The timing/urgency factor

### Our Value
How our services could help them capitalize or respond

### The Ask
A soft call-to-action

Keep each section concise but powerful. Remember to add blank lines between paragraphs.`,

      intro_email: `
${baseContext}

Write a cold INTRO EMAIL to a decision-maker at a relevant company.

The email should:
1. Have a compelling subject line
2. Open with something relevant to THEM (not about us)
3. Reference the market intelligence naturally
4. Briefly mention how we could help
5. End with a low-friction ask (15-min call, not a pitch meeting)

Keep it under 150 words. Be human, not salesy.

IMPORTANT: Format with clear paragraph breaks. Each paragraph should be separated by a blank line. The greeting, each body paragraph, and the sign-off should all be separate paragraphs.`,

      follow_up: `
${baseContext}

Write a FOLLOW-UP EMAIL for someone I've previously contacted about this topic.

The email should:
1. Reference the previous conversation naturally
2. Share a new insight or development as a reason for reaching out
3. Provide value without asking for anything
4. Gently suggest next steps

Keep it under 100 words.

IMPORTANT: Format with clear paragraph breaks. Each paragraph should be separated by a blank line.`,

      talking_points: `
${baseContext}

Create TALKING POINTS for a call or meeting about this topic.

Use this structure with ### headers and bullet points:

### Opening Hook
- Conversation starter points

### Key Market Insights
- Insight 1
- Insight 2
- Insight 3

### Discovery Questions
- Questions to understand their situation

### Transition to Services
- How to naturally bring up our capabilities

### Handling Objections
- Common objection → Response

Add blank lines between each section for readability.`
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
                <CardContent className="p-4 prose prose-sm max-w-none">
                  <ReactMarkdown>{generatedContent}</ReactMarkdown>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}