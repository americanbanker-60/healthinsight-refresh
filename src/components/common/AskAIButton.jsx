import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

/**
 * A reusable "Ask AI" button that triggers the floating AIResearchAssistant
 * with a pre-seeded message/context.
 * 
 * Usage: Dispatch a custom event that the AIResearchAssistant listens for.
 * This avoids prop-drilling through the layout.
 */
export default function AskAIButton({ prompt, label = "Ask AI", variant = "outline", size = "sm", className = "" }) {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("askAI", { detail: { prompt } }));
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={`gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 ${className}`}
    >
      <Sparkles className="w-3.5 h-3.5" />
      {label}
    </Button>
  );
}