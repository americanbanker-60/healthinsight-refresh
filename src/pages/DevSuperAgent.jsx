import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Terminal, Trash2, Zap, AlertCircle, CheckCircle2, ChevronRight, Copy, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

const QUICK_PROMPTS = [
  "Why is saving to the library silently failing?",
  "Why is the email send failing?",
  "Data isn't appearing on the Dashboard after saving — what's wrong?",
  "Check if there are any NewsletterItems stuck in 'processing' status",
  "Why am I seeing 'Entity schema Newsletter not found' errors?",
  "How do I fix an RLS permission error on a frontend entity create?",
  "Find NewsletterItems that have is_analyzed=false but status=completed",
];

function ToolCallBubble({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const statusColors = {
    completed: "text-green-600",
    running: "text-blue-500",
    failed: "text-red-500",
    pending: "text-slate-400",
  };
  const color = statusColors[toolCall.status] || "text-slate-400";
  const isRunning = toolCall.status === "running" || toolCall.status === "in_progress";

  let parsed = null;
  try { parsed = toolCall.results ? JSON.parse(toolCall.results) : null; } catch {}

  return (
    <div className="mt-2 text-xs font-mono">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg hover:border-slate-500 transition-all"
      >
        {isRunning ? (
          <Loader2 className={`h-3 w-3 ${color} animate-spin`} />
        ) : toolCall.status === "completed" ? (
          <CheckCircle2 className={`h-3 w-3 ${color}`} />
        ) : (
          <AlertCircle className={`h-3 w-3 ${color}`} />
        )}
        <span className="text-slate-300">{toolCall.name?.replace(/\./g, " › ") || "tool"}</span>
        {toolCall.status && (
          <span className={`${color} opacity-70`}>• {isRunning ? "running..." : toolCall.status}</span>
        )}
        {!isRunning && (toolCall.arguments_string || parsed) && (
          <ChevronRight className={`h-3 w-3 text-slate-500 transition-transform ${expanded ? "rotate-90" : ""}`} />
        )}
      </button>
      {expanded && !isRunning && (
        <div className="mt-1 ml-3 pl-3 border-l border-slate-700 space-y-2">
          {toolCall.arguments_string && (
            <div>
              <p className="text-slate-500 mb-1">Args:</p>
              <pre className="bg-slate-900 border border-slate-700 rounded p-2 text-green-400 whitespace-pre-wrap text-xs overflow-auto max-h-40">
                {(() => { try { return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2); } catch { return toolCall.arguments_string; } })()}
              </pre>
            </div>
          )}
          {parsed && (
            <div>
              <p className="text-slate-500 mb-1">Result:</p>
              <pre className="bg-slate-900 border border-slate-700 rounded p-2 text-cyan-400 whitespace-pre-wrap text-xs overflow-auto max-h-40">
                {JSON.stringify(parsed, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Message({ message }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopyForAI = () => {
    const text = `The Dev Super Agent diagnosed the following issue in my HealthInsight app. Please implement the suggested fix:\n\n---\n${message.content}\n---`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied! Paste it into the Base44 AI chat to implement the fix.");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-green-900/50 border border-green-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Terminal className="w-3.5 h-3.5 text-green-400" />
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? "items-end flex flex-col" : ""}`}>
        {message.content && (
          <>
            <div className={`rounded-xl px-4 py-3 ${
              isUser
                ? "bg-indigo-600 text-white text-sm"
                : "bg-slate-800 border border-slate-700 text-slate-100"
            }`}>
              {isUser ? (
                <p className="text-sm leading-relaxed">{message.content}</p>
              ) : (
                <ReactMarkdown
                  className="text-sm prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                  components={{
                    code: ({ inline, children }) =>
                      inline
                        ? <code className="bg-slate-700 text-green-300 px-1 py-0.5 rounded text-xs">{children}</code>
                        : <pre className="bg-slate-900 border border-slate-700 rounded-lg p-3 overflow-x-auto my-2"><code className="text-green-300 text-xs">{children}</code></pre>,
                    strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                    a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">{children}</a>,
                    ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                    ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                    li: ({ children }) => <li className="my-0.5 text-slate-200">{children}</li>,
                    h1: ({ children }) => <h1 className="text-base font-bold text-white my-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-sm font-bold text-white my-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-200 my-1">{children}</h3>,
                    p: ({ children }) => <p className="my-1 leading-relaxed text-slate-200">{children}</p>,
                    blockquote: ({ children }) => <blockquote className="border-l-2 border-green-600 pl-3 text-slate-400 italic my-2">{children}</blockquote>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </div>
            {!isUser && (
              <button
                onClick={handleCopyForAI}
                className="mt-1.5 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-900/40 border border-indigo-700/50 text-indigo-300 hover:bg-indigo-800/50 hover:text-indigo-200 transition-all"
              >
                {copied ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied! Now paste in the AI chat →" : "Copy fix → paste into Base44 AI chat to implement"}
              </button>
            )}
          </>
        )}
        {message.tool_calls?.map((tc, i) => <ToolCallBubble key={i} toolCall={tc} />)}
      </div>
    </div>
  );
}

export default function DevSuperAgent() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    initConversation();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initConversation = async () => {
    const convo = await base44.agents.createConversation({
      agent_name: "dev_super_agent",
      metadata: { name: "Dev Debug Session — " + new Date().toLocaleString() },
    });
    setConversation(convo);
    setMessages(convo.messages || []);

    base44.agents.subscribeToConversation(convo.id, (data) => {
      setMessages(data.messages || []);
      const last = data.messages?.[data.messages.length - 1];
      if (last?.role === "assistant" && !last.tool_calls?.some(tc => tc.status === "running")) {
        setIsSending(false);
      }
    });
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || !conversation) return;
    setInput("");
    setIsSending(true);
    await base44.agents.addMessage(conversation, { role: "user", content: msg });
  };

  const clearSession = async () => {
    setMessages([]);
    setConversation(null);
    setIsSending(false);
    await initConversation();
    toast.success("New session started");
  };

  const isThinking = isSending || messages[messages.length - 1]?.tool_calls?.some(tc =>
    tc.status === "running" || tc.status === "in_progress"
  );

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-900/50 border border-green-700 rounded-lg flex items-center justify-center">
            <Terminal className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">Dev Super Agent</h1>
            <p className="text-xs text-slate-400">HealthInsight platform diagnostics & fixes</p>
          </div>
          <Badge className="bg-green-900/50 text-green-400 border-green-700 text-xs ml-2">
            <Zap className="w-3 h-3 mr-1" />Admin Only
          </Badge>
        </div>
        <Button onClick={clearSession} variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200 hover:bg-slate-800">
          <Trash2 className="w-4 h-4 mr-1" />New Session
        </Button>
      </div>

      {/* Quick prompts */}
      <div className="px-4 py-2 border-b border-slate-800 flex gap-2 overflow-x-auto flex-shrink-0">
        {QUICK_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => sendMessage(p)}
            disabled={isSending}
            className="flex-shrink-0 text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-full text-slate-300 hover:text-white transition-all disabled:opacity-40"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !isThinking && (
          <div className="text-center py-16">
            <Terminal className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Dev Super Agent ready</p>
            <p className="text-slate-600 text-sm mt-1">Describe a problem or pick a quick prompt above</p>
          </div>
        )}
        {messages.map((msg, i) => <Message key={i} message={msg} />)}
        {isThinking && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-green-900/50 border border-green-700/50 flex items-center justify-center">
              <Terminal className="w-3.5 h-3.5 text-green-400" />
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-800 bg-slate-900 flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Describe a bug, ask for a diagnosis, or request a fix..."
            disabled={isSending || !conversation}
            className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-green-600"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isSending || !conversation}
            className="bg-green-700 hover:bg-green-600 text-white flex-shrink-0"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-slate-600 mt-1.5 text-center">Admin-only tool · Has read access to all entities</p>
      </div>
    </div>
  );
}