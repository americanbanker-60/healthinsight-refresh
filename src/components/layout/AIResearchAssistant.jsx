import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

const PAGE_CONTEXT_MAP = {
  Dashboard: "The user is on the main Healthcare Intelligence Dashboard, showing recent newsletters, stats, trends, and M&A activity.",
  KnowledgeHub: "The user is on the Knowledge Hub, exploring emerging healthcare themes and key market players.",
  PEMeetingPrep: "The user is on the PE Meeting Prep page, generating AI-powered briefs for private equity meetings.",
  MyLibrary: "The user is on My Library, viewing saved searches, summaries, and watched topics.",
  ExploreAllSources: "The user is on the Explore All Sources page, browsing and filtering all healthcare newsletter content.",
  CompaniesDirectory: "The user is on the Companies Directory, viewing tracked healthcare companies.",
  UserSettings: "The user is on User Settings, configuring their preferences.",
  MyCustomPacks: "The user is on Research Folders, managing curated intelligence packs.",
  AgentWorkspace: "The user is in the AI Agent Workspace.",
  DeepDiveResults: "The user is viewing a Deep Dive AI analysis of healthcare market trends.",
};

const SUGGESTIONS = [
  "What are the key risks mentioned on this page?",
  "Find similar companies in the directory",
  "What M&A trends should I be watching?",
  "Summarize the most important recent deals",
];

export default function AIResearchAssistant({ currentPageName }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const pageContext = PAGE_CONTEXT_MAP[currentPageName] || `The user is on the ${currentPageName || "app"} page.`;

  const sendMessage = async (text) => {
    const question = text || input.trim();
    if (!question || isLoading) return;

    const userMsg = { role: "user", content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const history = [...messages, userMsg]
      .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const answer = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an AI Research Assistant embedded in HealthInsight, a healthcare intelligence platform for investment bankers and analysts.

Page Context: ${pageContext}

Conversation so far:
${history}

Answer the user's latest question concisely and helpfully. Focus on healthcare M&A, market trends, deal intelligence, and actionable insights. Use markdown formatting where helpful. Keep responses under 300 words unless detail is truly needed.`,
    });

    setMessages(prev => [...prev, { role: "assistant", content: answer }]);
    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center group"
        title="AI Research Assistant"
      >
        <Bot className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white" />
      </button>

      {/* Slide-over panel */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:w-[420px] flex flex-col p-0">
          <SheetHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600">
            <SheetTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Research Assistant
            </SheetTitle>
            <p className="text-blue-100 text-xs mt-0.5">{currentPageName || "App"} context active</p>
          </SheetHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500 text-center pt-2">Ask anything about your healthcare intelligence</p>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-left text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-blue-700 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}>
                  {msg.role === "assistant" ? (
                    <ReactMarkdown className="prose prose-sm max-w-none prose-slate [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      {msg.content}
                    </ReactMarkdown>
                  ) : msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  <span className="text-xs text-slate-400">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 px-4 py-3 bg-white">
            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about healthcare trends, deals, companies..."
                className="resize-none text-sm min-h-[44px] max-h-[120px]"
                rows={1}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0 bg-blue-600 hover:bg-blue-700 h-[44px] w-[44px]"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}