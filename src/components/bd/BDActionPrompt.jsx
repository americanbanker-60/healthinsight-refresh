import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Mail, Users, FileText, TrendingUp, Lightbulb, BookmarkPlus, Check, ArrowRight } from "lucide-react";
import BDContentGeneratorModal from "./BDContentGeneratorModal";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

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
      { label: "Add to pipeline", icon: BookmarkPlus },
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
  const [saved, setSaved] = useState(false);
  const config = actionTypes[type] || actionTypes.newsletter;
  const Icon = config.icon;

  const saveToOpportunities = async () => {
    try {
      // Check for duplicate: prevent saving if newsletter_id already exists
      if (contextData?.newsletter_id) {
        const existing = await base44.entities.BDOpportunity.filter({ newsletter_id: contextData.newsletter_id });
        if (existing && existing.length > 0) {
          toast.info(
            <span>
              This article is already in your BD Opportunities.{" "}
              <a href={createPageUrl("BDOpportunities")} className="underline font-semibold">
                View &amp; generate outreach →
              </a>
            </span>
          );
          setSaved(true);
          return;
        }
      }
      
      await base44.entities.BDOpportunity.create({
        title: contextData?.title || "Untitled Opportunity",
        source_type: type,
        context_summary: context,
        companies: contextData?.companies || [],
        deals: contextData?.deals || "",
        themes: contextData?.themes || [],
        newsletter_id: contextData?.newsletter_id || "",
        newsletter_title: contextData?.title || "",
        status: "new",
      });
      setSaved(true);
      toast.success(
        <span>
          Saved to BD Opportunities.{" "}
          <a href={createPageUrl("BDOpportunities")} className="underline font-semibold">
            View &amp; generate outreach →
          </a>
        </span>
      );
    } catch {
      toast.error("Failed to save opportunity");
    }
  };

  const handleAction = (actionLabel) => {
    if (actionLabel.toLowerCase() === "add to pipeline") {
      saveToOpportunities();
      return;
    }
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
            {config.actions.map((action, idx) => {
              const isPipeline = action.label.toLowerCase() === "add to pipeline";
              return (
                <Button
                  key={idx}
                  size="sm"
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs h-7"
                  onClick={() => handleAction(action.label)}
                  disabled={isPipeline && saved}
                >
                  {isPipeline && saved
                    ? <><Check className="w-3 h-3 mr-1" />Saved!</>
                    : <><action.icon className="w-3 h-3 mr-1" />{action.label}</>
                  }
                </Button>
              );
            })}
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
                {config.actions.map((action, idx) => {
                  const isPipeline = action.label.toLowerCase() === "add to pipeline";
                  return (
                    <Button
                      key={idx}
                      size="sm"
                      variant="secondary"
                      className="bg-white/20 hover:bg-white/30 text-white border-0"
                      onClick={() => handleAction(action.label)}
                      disabled={isPipeline && saved}
                    >
                      {isPipeline && saved
                        ? <><Check className="w-4 h-4 mr-2" />Saved!</>
                        : <><action.icon className="w-4 h-4 mr-2" />{action.label}</>
                      }
                    </Button>
                  );
                })}
              </div>
              {saved && (
                <Link
                  to={createPageUrl("BDOpportunities")}
                  className="inline-flex items-center gap-1 text-xs text-white/80 hover:text-white underline underline-offset-2 mt-1"
                >
                  <ArrowRight className="w-3 h-3" />
                  Go to BD Opportunities to generate outreach
                </Link>
              )}
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