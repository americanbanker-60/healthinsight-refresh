import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, Brain, Briefcase, FileText, AlertCircle, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

// Intent detection patterns
const INTENT_PATTERNS = {
  insight_analyst: {
    keywords: ['summarize', 'analyze', 'extract', 'key points', 'what does this mean', 'themes', 'case study', 
               'what\'s happening', 'research', 'explain', 'brief', 'breakdown', 'insights', 'understanding',
               'facts', 'timeline', 'validate', 'check', 'review content'],
    patterns: [
      /summari[zs]e/i, /analy[zs]e/i, /extract/i, /key\s+(points|takeaways)/i,
      /what\s+does\s+this\s+mean/i, /give\s+me\s+themes/i, /build\s+a\s+case\s+study/i,
      /what.*happening/i, /research\s+this/i, /explain/i, /turn.*into.*brief/i
    ]
  },
  strategic_bd_advisor: {
    keywords: ['bd', 'outreach', 'business development', 'reach out', 'talking points', 'pipeline', 
               'opportunities', 'actionable', 'recommendations', 'angles', 'strategy', 'prospects',
               'how should i use', 'what should i do', 'position', 'campaigns'],
    patterns: [
      /how\s+should\s+i\s+use.*for\s+bd/i, /what\s+should\s+i\s+do\s+with/i,
      /outreach\s+angles/i, /how\s+should\s+i\s+reach\s+out/i, /turn.*into.*bd/i,
      /talking\s+points/i, /help.*pipeline/i, /bd\s+opportunities/i,
      /actionable\s+recommendations/i
    ]
  },
  formatting_export_director: {
    keywords: ['format', 'clean up', 'polish', 'professional', 'export', 'markdown', 'pdf', 'docx',
               'banker-style', 'consulting-style', 'presentable', 'prepare', 'structure'],
    patterns: [
      /format\s+this/i, /clean.*up/i, /make.*professional/i, /banker[- ]style/i,
      /export.*as/i, /polish/i, /prepare.*for/i, /fix.*formatting/i,
      /make.*presentable/i, /consulting[- ]style/i
    ]
  }
};

// Agent metadata
const AGENT_CONFIG = {
  insight_analyst: {
    name: "Insight Analyst",
    icon: Brain,
    color: "blue",
    description: "Research, summarization, and analysis"
  },
  strategic_bd_advisor: {
    name: "Strategic BD Advisor",
    icon: Briefcase,
    color: "purple",
    description: "Business development strategy and outreach"
  },
  formatting_export_director: {
    name: "Formatting & Export Director",
    icon: FileText,
    color: "green",
    description: "Professional formatting and export preparation"
  }
};

// Detect workflow chains
const detectWorkflowChain = (input) => {
  const lower = input.toLowerCase();
  const chains = [];
  
  // Analysis → BD → Formatting
  const needsAnalysis = INTENT_PATTERNS.insight_analyst.patterns.some(p => p.test(input)) ||
                        INTENT_PATTERNS.insight_analyst.keywords.some(k => lower.includes(k));
  const needsBD = INTENT_PATTERNS.strategic_bd_advisor.patterns.some(p => p.test(input)) ||
                  INTENT_PATTERNS.strategic_bd_advisor.keywords.some(k => lower.includes(k));
  const needsFormatting = INTENT_PATTERNS.formatting_export_director.patterns.some(p => p.test(input)) ||
                          INTENT_PATTERNS.formatting_export_director.keywords.some(k => lower.includes(k));
  
  if (needsAnalysis) chains.push('insight_analyst');
  if (needsBD && !chains.includes('strategic_bd_advisor')) chains.push('strategic_bd_advisor');
  if (needsFormatting && !chains.includes('formatting_export_director')) chains.push('formatting_export_director');
  
  return chains;
};

// Intent detection function
const detectIntent = (input) => {
  const lower = input.toLowerCase();
  const scores = {
    insight_analyst: 0,
    strategic_bd_advisor: 0,
    formatting_export_director: 0
  };
  
  // Score based on keywords
  Object.entries(INTENT_PATTERNS).forEach(([agent, config]) => {
    config.keywords.forEach(keyword => {
      if (lower.includes(keyword)) {
        scores[agent] += 1;
      }
    });
    
    config.patterns.forEach(pattern => {
      if (pattern.test(input)) {
        scores[agent] += 2; // Patterns weighted higher
      }
    });
  });
  
  // Detect chained workflows
  const chain = detectWorkflowChain(input);
  if (chain.length > 1) {
    return { agent: null, chain, isChain: true, scores };
  }
  
  // Find highest scoring agent
  const maxScore = Math.max(...Object.values(scores));
  
  // If no clear winner or score too low, ask for clarification
  if (maxScore === 0 || Object.values(scores).filter(s => s === maxScore).length > 1) {
    return { agent: null, chain: [], isChain: false, scores, needsClarification: true };
  }
  
  const selectedAgent = Object.entries(scores).find(([_, score]) => score === maxScore)[0];
  return { agent: selectedAgent, chain: [selectedAgent], isChain: false, scores };
};

export default function AgentRouter({ initialPrompt = "", initialContext = "" }) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [context, setContext] = useState(initialContext);
  const [detectedIntent, setDetectedIntent] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [response, setResponse] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [workflowChain, setWorkflowChain] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [chainResults, setChainResults] = useState([]);
  const responseRef = useRef(null);
  
  // Auto-detect intent when prompt changes
  useEffect(() => {
    if (prompt.trim().length > 10) {
      const intent = detectIntent(prompt);
      setDetectedIntent(intent);
    } else {
      setDetectedIntent(null);
    }
  }, [prompt]);
  
  // Scroll to response when it updates
  useEffect(() => {
    if (response && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [response]);
  
  const executeAgent = async (agentName, inputPrompt, additionalContext = "") => {
    const fullPrompt = additionalContext 
      ? `${inputPrompt}\n\nContext from previous step:\n${additionalContext}`
      : inputPrompt;
    
    const contextData = context.trim() ? `\n\nAdditional Context:\n${context}` : "";
    
    try {
      const result = await base44.agents.addMessage(
        { agent_name: agentName },
        {
          role: "user",
          content: fullPrompt + contextData
        }
      );
      
      // Extract assistant response
      const assistantMessages = result.messages.filter(m => m.role === 'assistant');
      const lastMessage = assistantMessages[assistantMessages.length - 1];
      
      return {
        agent: agentName,
        content: lastMessage?.content || "No response generated.",
        fullConversation: result
      };
    } catch (error) {
      console.error(`Error executing ${agentName}:`, error);
      throw new Error(`Failed to execute ${AGENT_CONFIG[agentName].name}: ${error.message}`);
    }
  };
  
  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    
    setIsProcessing(true);
    setResponse(null);
    setChainResults([]);
    
    try {
      const intent = detectedIntent || detectIntent(prompt);
      
      // Handle clarification needed
      if (intent.needsClarification) {
        setResponse({
          type: 'clarification',
          message: "I need clarification on what you'd like me to do. Would you like:\n\n• **Analysis** (extract insights, summarize content)\n• **BD Recommendations** (outreach angles, strategy)\n• **Formatting** (polish and prepare for export)\n\nPlease specify your primary goal."
        });
        setIsProcessing(false);
        return;
      }
      
      // Handle chained workflow
      if (intent.isChain && intent.chain.length > 1) {
        setWorkflowChain(intent.chain);
        setCurrentStep(0);
        
        let previousOutput = "";
        const results = [];
        
        for (let i = 0; i < intent.chain.length; i++) {
          setCurrentStep(i);
          const agentName = intent.chain[i];
          
          toast.info(`Step ${i + 1}/${intent.chain.length}: ${AGENT_CONFIG[agentName].name}`);
          
          const result = await executeAgent(agentName, prompt, previousOutput);
          results.push(result);
          previousOutput = result.content;
          
          setChainResults([...results]);
        }
        
        setResponse({
          type: 'chain',
          results: results,
          chain: intent.chain
        });
      } else {
        // Single agent execution
        const agentName = intent.agent || selectedAgent;
        if (!agentName) {
          toast.error("Unable to determine which agent to use");
          setIsProcessing(false);
          return;
        }
        
        const result = await executeAgent(agentName, prompt);
        setResponse({
          type: 'single',
          result: result
        });
      }
      
      toast.success("Processing complete");
    } catch (error) {
      toast.error(error.message);
      console.error("Agent execution error:", error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const getAgentBadge = (agentName) => {
    const config = AGENT_CONFIG[agentName];
    const Icon = config.icon;
    return (
      <Badge className={`bg-${config.color}-100 text-${config.color}-700 border-${config.color}-300`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.name}
      </Badge>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Your Request</label>
            <Textarea
              placeholder="E.g., 'Analyze this newsletter and give me BD angles' or 'Format this as a professional brief'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="mb-2"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Additional Context (Optional)</label>
            <Textarea
              placeholder="Paste URLs, text content, or provide additional context here..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
            />
          </div>
          
          {/* Intent Detection Display */}
          {detectedIntent && !detectedIntent.needsClarification && (
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">Detected:</span>
                  {detectedIntent.isChain ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {detectedIntent.chain.map((agent, idx) => (
                        <React.Fragment key={agent}>
                          {getAgentBadge(agent)}
                          {idx < detectedIntent.chain.length - 1 && (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </React.Fragment>
                      ))}
                      <span className="text-xs text-slate-500">(Chained workflow)</span>
                    </div>
                  ) : (
                    getAgentBadge(detectedIntent.agent)
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Manual Agent Selection (if detection unclear) */}
          {detectedIntent?.needsClarification && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Agent</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(AGENT_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedAgent(key);
                        setDetectedIntent({ agent: key, chain: [key], isChain: false });
                      }}
                      className={`p-4 border rounded-lg text-left transition-all hover:shadow-md ${
                        selectedAgent === key ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-5 h-5" />
                        <span className="font-semibold">{config.name}</span>
                      </div>
                      <p className="text-xs text-slate-600">{config.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          <Button
            onClick={handleSubmit}
            disabled={isProcessing || !prompt.trim()}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Execute
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      {/* Response Section */}
      {response && (
        <div ref={responseRef}>
          {response.type === 'clarification' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ReactMarkdown className="text-sm">{response.message}</ReactMarkdown>
              </AlertDescription>
            </Alert>
          )}
          
          {response.type === 'single' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Response</CardTitle>
                  {getAgentBadge(response.result.agent)}
                </div>
              </CardHeader>
              <CardContent>
                <ReactMarkdown className="prose prose-sm max-w-none">
                  {response.result.content}
                </ReactMarkdown>
              </CardContent>
            </Card>
          )}
          
          {response.type === 'chain' && (
            <div className="space-y-4">
              <Alert className="bg-purple-50 border-purple-200">
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">Workflow completed:</span>
                    {response.chain.map((agent, idx) => (
                      <React.Fragment key={agent}>
                        {getAgentBadge(agent)}
                        {idx < response.chain.length - 1 && (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
              
              {response.results.map((result, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Step {idx + 1}: {AGENT_CONFIG[result.agent].name}
                      </CardTitle>
                      {getAgentBadge(result.agent)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ReactMarkdown className="prose prose-sm max-w-none">
                      {result.content}
                    </ReactMarkdown>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Agent Reference */}
      <Card className="bg-slate-50">
        <CardHeader>
          <CardTitle className="text-sm">Agent Capabilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(AGENT_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div key={key} className="flex items-start gap-3">
                <Icon className="w-5 h-5 mt-0.5 text-slate-600" />
                <div>
                  <p className="font-medium text-sm">{config.name}</p>
                  <p className="text-xs text-slate-600">{config.description}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}