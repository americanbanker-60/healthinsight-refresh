import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MessageBubble from "@/components/agents/MessageBubble";

const PAGE_SUGGESTIONS = {
  Dashboard: [
    "What are the top M&A themes from recent newsletters?",
    "Which sectors have the most activity this month?",
    "Give me a quick market pulse summary",
  ],
  KnowledgeHub: [
    "What emerging themes should I be tracking?",
    "Who are the most active acquirers right now?",
    "Summarize the biggest deals in my library",
  ],
  PEMeetingPrep: [
    "What should I know before a behavioral health PE meeting?",
    "What are current healthcare services deal multiples?",
    "What questions should I ask a telehealth company?",
  ],
  ExploreAllSources: [
    "What are analysts saying about value-based care?",
    "Which companies have raised funding recently?",
    "Summarize the ASC sector outlook",
  ],
  CompaniesDirectory: [
    "Who are the most mentioned acquirers in healthcare?",
    "Which companies are involved in the most deals?",
  ],
  MyLibrary: [
    "What topics should I be watching based on recent trends?",
    "Give me a BD angle from recent market activity",
  ],
  MyCustomPacks: [
    "What's the current state of tech-enabled healthcare services?",
    "Draft outreach talking points from recent M&A activity",
  ],
};

const DEFAULT_SUGGESTIONS = [
  "What are the top M&A themes from recent newsletters?",
  "Which companies have raised funding recently?",
  "Draft BD outreach angles from recent market activity",
  "Summarize the most important recent deals",
];

export default function AIResearchAssistant({ currentPageName, initialMessage }) {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const bottomRef = useRef(null);
  const hasAutoOpened = useRef(false);

  // Listen for contextual "Ask AI" events from anywhere in the app
  useEffect(() => {
    const handler = (e) => {
      const prompt = e.detail?.prompt;
      if (!prompt) return;
      setOpen(true);
      setTimeout(() => sendMessage(prompt), 300);
    };
    window.addEventListener("askAI", handler);
    return () => window.removeEventListener("askAI", handler);
  }, []);

  // Auto-open when an initialMessage is passed (contextual trigger)
  useEffect(() => {
    if (initialMessage && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      setOpen(true);
      setTimeout(() => sendMessage(initialMessage), 300);
    }
  }, [initialMessage]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSending]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsubscribe;
  }, [conversation?.id]);

  const getOrCreateConversation = async () => {
    if (conversation) return conversation;
    setIsInitializing(true);
    const convo = await base44.agents.createConversation({
      agent_name: "healthinsight_assistant",
      metadata: { name: `Chat — ${new Date().toLocaleDateString()}` }
    });
    setConversation(convo);
    setMessages([]);
    setIsInitializing(false);
    return convo;
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || isSending) return;
    setInput("");
    setIsSending(true);

    const convo = await getOrCreateConversation();
    setMessages(prev => [...prev, { role: "user", content: msg }]);

    try {
      await base44.agents.addMessage(convo, { role: "user", content: msg });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestions = PAGE_SUGGESTIONS[currentPageName] || DEFAULT_SUGGESTIONS;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center"
        title="HealthInsight Assistant"
      >
        <Bot className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:w-[440px] flex flex-col p-0">
          <SheetHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600">
            <SheetTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              HealthInsight Assistant
            </SheetTitle>
            <div className="flex items-center justify-between">
              <p className="text-blue-100 text-xs mt-0.5">Research · BD Strategy · Formatting</p>
              <Link
                to={createPageUrl("ResearchAssistant")}
                onClick={() => setOpen(false)}
                className="text-blue-200 hover:text-white text-xs flex items-center gap-1 transition-colors"
              >
                Full view <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </SheetHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && !isInitializing && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500 text-center pt-2">Ask anything about your healthcare intelligence</p>
                <div className="grid grid-cols-1 gap-2">
                  {suggestions.map((s) => (
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
              <MessageBubble key={i} message={msg} />
            ))}

            {isSending && messages[messages.length - 1]?.role === "user" && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
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
                placeholder="Ask about deals, trends, BD angles..."
                className="resize-none text-sm min-h-[44px] max-h-[120px]"
                rows={1}
                disabled={isSending}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isSending}
                size="icon"
                className="shrink-0 bg-blue-600 hover:bg-blue-700 h-[44px] w-[44px]"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}