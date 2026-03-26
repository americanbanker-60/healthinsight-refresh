import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Mail, Users, FileText, TrendingUp, Lightbulb } from "lucide-react";
import BDContentGeneratorModal from "./BDContentGeneratorModal";

const actionTypes = {
  newsletter: {
    icon: Mail,
    color: "from-blue-600 to-indigo-600",
    title: "Turn This Into Outreach",
    actions: [
      { label: "Draft outreach email", icon: Mail },
      { label: "Identify target contacts", icon: Users },
    ]
  },
  topic: {
    icon: Lightbulb,
    color: "from-amber-500 to-orange-600",
    title: "BD Opportunity",
    actions: [
      { label: "Build target list", icon: Users },
      { label: "Create pitch angle", icon: FileText },
    ]
  },
  company: {
    icon: TrendingUp,
    color: "from-green-600 to-emerald-600",
    title: "Outreach Opportunity",
    actions: [
      { label: "Research contacts", icon: Users },
      { label: "Draft intro email", icon: Mail },
    ]
  },
  deal: {
    icon: Zap,
    color: "from-purple-600 to-pink-600",
    title: "Deal Signal Detected",
    actions: [
      { label: "Add to pipeline", icon: FileText },
      { label: "Reach out now", icon: Mail },
    ]
  }
};

export default function BDActionPrompt({ 
  type = "newsletter", 
  context = "", 
  onAction,
  variant = "default", // "default" | "compact" | "inline"
  contextData = {} // Data to pass to the generator modal
}) {
  const [showGenerator, setShowGenerator] = useState(false);
  const [activeActionLabel, setActiveActionLabel] = useState("");
  const config = actionTypes[type] || actionTypes.newsletter;
  const Icon = config.icon;

  const handleAction = (actionLabel) => {
    if (onAction) {
      onAction(actionLabel);
    } else {
      setActiveActionLabel(actionLabel);
      setShowGenerator(true);
    }
  };

  if (variant === "inline") {
    return (
      <>
        <div className="flex items-center gap-2 text-sm bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-3 py-2">
          <Zap className="w-4 h-4 text-blue-600" />
          <span className="text-blue-800 font-medium">BD Action:</span>
          <span className="text-blue-700">{context || "Use this insight for outreach"}</span>
        </div>
        <BDContentGeneratorModal
          open={showGenerator}
          onClose={() => setShowGenerator(false)}
          contextType={type}
          contextData={{ ...contextData, actionLabel: activeActionLabel }}
        />
      </>
    );
  }

  if (variant === "compact") {
    return (
      <>
        <div className={`bg-gradient-to-r ${config.color} rounded-lg p-3 text-white`}>
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-4 h-4" />
            <span className="font-semibold text-sm">{config.title}</span>
          </div>
          <p className="text-xs text-white/90 mb-2">{context || "Turn this intelligence into action"}</p>
          <div className="flex gap-2 flex-wrap">
            {config.actions.map((action, idx) => (
              <Button
                key={idx}
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs h-7"
                onClick={() => handleAction(action.label)}
              >
                <action.icon className="w-3 h-3 mr-1" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
        <BDContentGeneratorModal
          open={showGenerator}
          onClose={() => setShowGenerator(false)}
          contextType={type}
          contextData={{ ...contextData, actionLabel: activeActionLabel }}
        />
      </>
    );
  }

  return (
    <>
      <Card className={`bg-gradient-to-r ${config.color} border-0 shadow-lg overflow-hidden`}>
        <CardContent className="p-4 text-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">{config.title}</h4>
              <p className="text-sm text-white/90 mb-3">
                {context || "This insight presents a business development opportunity. Take action now."}
              </p>
              <div className="flex flex-wrap gap-2">
                {config.actions.map((action, idx) => (
                  <Button
                    key={idx}
                    size="sm"
                    variant="secondary"
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                    onClick={() => handleAction(action.label)}
                  >
                    <action.icon className="w-4 h-4 mr-2" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <BDContentGeneratorModal
        open={showGenerator}
        onClose={() => setShowGenerator(false)}
        contextType={type}
        contextData={{ ...contextData, actionLabel: activeActionLabel }}
      />
    </>
  );
}

export function BDInsightBadge({ text }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 text-xs font-medium rounded-full border border-amber-200">
      <Zap className="w-3 h-3" />
      {text || "BD Insight"}
    </span>
  );
}

export function BDQuickAction({ label, onClick, icon: IconProp = Zap }) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100"
      onClick={onClick}
    >
      <IconProp className="w-4 h-4 mr-1" />
      {label}
    </Button>
  );
}