import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, Loader2, Plus, MessageSquare } from "lucide-react";
import MessageBubble from "@/components/agents/MessageBubble";

const SUGGESTED_QUESTIONS = [
  "What's happening in behavioral health M&A lately?",
  "Which companies have raised funding recently?",
  "What are the top themes across recent newsletters?",
  "Summarize recent activity in the ASC sector",
  "What are analysts saying about value-based care?",
];

export default function ResearchAssistant() {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConversation?.id) {
      const unsubscribe = base44.agents.subscribeToConversation(activeConversation.id, (data) => {
        setMessages(data.messages || []);
      });
      return unsubscribe;
    }
  }, [activeConversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const convos = await base44.agents.listConversations({ agent_name: "healthinsight_assistant" });
      setConversations(convos || []);
      if (convos?.length > 0) {
        selectConversation(convos[0]);
      }
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const selectConversation = async (convo) => {
    const full = await base44.agents.getConversation(convo.id);
    setActiveConversation(full);
    setMessages(full.messages || []);
  };

  const startNewConversation = async () => {
    const convo = await base44.agents.createConversation({
      agent_name: "healthinsight_assistant",
      metadata: { name: `Research — ${new Date().toLocaleDateString()}` }
    });
    setActiveConversation(convo);
    setMessages([]);
    setConversations(prev => [convo, ...prev]);
  };

  const generateTitle = async (msg) => {
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a concise, descriptive 4-6 word title for a healthcare research conversation that starts with this question: "${msg}"\n\nReturn ONLY the title text, no quotes, no punctuation at the end. Make it specific and meaningful (e.g. "Behavioral Health M&A Activity 2025", "ASC Sector Funding Trends", "Value-Based Care Analyst Views").`,
      });
      return result?.trim() || msg.slice(0, 50);
    } catch {
      return msg.slice(0, 50);
    }
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || isSending) return;
    setInput("");
    setIsSending(true);

    let convo = activeConversation;
    const isNewConvo = !convo;
    if (isNewConvo) {
      convo = await base44.agents.createConversation({
        agent_name: "healthinsight_assistant",
        metadata: { name: "New conversation…" }
      });
      setActiveConversation(convo);
      setConversations(prev => [convo, ...prev]);
    }

    // Optimistically add user message
    setMessages(prev => [...prev, { role: "user", content: msg }]);

    try {
      await base44.agents.addMessage(convo, { role: "user", content: msg });

      // Generate an AI title for new conversations after the first message
      if (isNewConvo) {
        const aiTitle = await generateTitle(msg);
        const updated = await base44.agents.updateConversation(convo.id, { metadata: { name: aiTitle } });
        setActiveConversation(prev => ({ ...prev, metadata: { ...prev?.metadata, name: aiTitle } }));
        setConversations(prev => prev.map(c => c.id === convo.id ? { ...c, metadata: { ...c.metadata, name: aiTitle } } : c));
      }
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

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200">
          <Button onClick={startNewConversation} className="w-full bg-slate-800 hover:bg-slate-900 text-white" size="sm">
            <Plus className="w-4 h-4 mr-2" /> New Conversation
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoadingConversations ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 px-3">No conversations yet. Ask your first question!</p>
            ) : (
              conversations.map(convo => (
                <button
                  key={convo.id}
                  onClick={() => selectConversation(convo)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeConversation?.id === convo.id
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{convo.metadata?.name || "Conversation"}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 pl-5">
                    {new Date(convo.created_date).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-900">HealthInsight Assistant</h1>
            <p className="text-xs text-slate-500">Research · BD Strategy · Professional Formatting</p>
          </div>
          <Badge variant="outline" className="ml-auto text-green-600 border-green-300 bg-green-50">Online</Badge>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">HealthInsight Assistant</h2>
                <p className="text-slate-500 max-w-md">Ask me anything — M&A activity, funding rounds, sector trends, BD outreach angles, or formatted briefs — all from your newsletter library.</p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-lg">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-left px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {isSending && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 shrink-0">
          <div className="flex gap-3 max-w-3xl mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about M&A, funding, trends, sectors..."
              className="flex-1"
              disabled={isSending}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isSending}
              className="bg-slate-800 hover:bg-slate-900"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}