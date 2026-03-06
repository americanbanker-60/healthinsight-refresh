import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, Database, Cpu, TrendingUp, Sparkles } from "lucide-react";

const steps = [
  {
    number: "1",
    icon: Database,
    title: "Add a Source",
    description: "Go to Admin Dashboard and add newsletter sources (e.g. Healthcare Finance News, Rock Health).",
    color: "blue",
  },
  {
    number: "2",
    icon: Cpu,
    title: "Scrape Newsletters",
    description: "Use the Source Scraper to fetch and import articles from your sources into the database.",
    color: "indigo",
  },
  {
    number: "3",
    icon: TrendingUp,
    title: "Discover Trends",
    description: "Once newsletters are analyzed, your dashboard will populate with M&A deals, funding rounds, and themes.",
    color: "purple",
  },
];

const colorMap = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "bg-blue-100 text-blue-600",
    number: "text-blue-400",
  },
  indigo: {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    icon: "bg-indigo-100 text-indigo-600",
    number: "text-indigo-400",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: "bg-purple-100 text-purple-600",
    number: "text-purple-400",
  },
};

export default function GettingStartedGuide() {
  return (
    <div className="mb-8 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Getting Started</h2>
      </div>
      <p className="text-slate-600 mb-8 ml-12">
        Your dashboard is empty. Follow these steps to start tracking healthcare intelligence.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {steps.map((step, i) => {
          const c = colorMap[step.color];
          const Icon = step.icon;
          return (
            <div key={step.number} className={`relative rounded-xl border ${c.border} ${c.bg} p-5`}>
              <span className={`absolute top-4 right-4 text-4xl font-black ${c.number} opacity-30 select-none`}>
                {step.number}
              </span>
              <div className={`w-10 h-10 rounded-lg ${c.icon} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{step.title}</h3>
              <p className="text-sm text-slate-600">{step.description}</p>
              {i < steps.length - 1 && (
                <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link to={createPageUrl("AdminDashboard")}>
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md px-6">
            <Database className="w-4 h-4 mr-2" />
            Go to Admin Dashboard
          </Button>
        </Link>
        <Link to={createPageUrl("AnalyzeNewsletter")}>
          <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50 px-6">
            <Cpu className="w-4 h-4 mr-2" />
            Analyze a Newsletter Manually
          </Button>
        </Link>
      </div>
    </div>
  );
}