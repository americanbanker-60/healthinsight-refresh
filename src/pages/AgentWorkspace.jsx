import React from "react";
import AgentRouter from "../components/agents/AgentRouter";

export default function AgentWorkspace() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">AI Agent Workspace</h1>
        <p className="text-slate-600">
          Interact with specialized AI agents for research, business development, and formatting.
          Simply describe what you need, and the system will route to the right agent automatically.
        </p>
      </div>
      
      <AgentRouter />
    </div>
  );
}