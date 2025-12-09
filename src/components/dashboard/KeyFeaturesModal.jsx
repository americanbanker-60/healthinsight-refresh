import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Compass, 
  BookOpen, 
  Lightbulb, 
  Building2, 
  Search, 
  TrendingUp, 
  FileText, 
  FolderOpen,
  Globe,
  Sparkles,
  Briefcase,
  Brain
} from "lucide-react";

const features = [
  {
    icon: Compass,
    title: "Knowledge Hub",
    description: "Your central dashboard for healthcare intelligence. Get quick access to trending topics, recent insights, and personalized recommendations.",
    color: "bg-blue-100 text-blue-600"
  },
  {
    icon: TrendingUp,
    title: "Explore All Sources",
    description: "Search and filter across all newsletter content. Find specific topics, companies, or trends with powerful filtering options.",
    color: "bg-green-100 text-green-600"
  },
  {
    icon: BookOpen,
    title: "Learning Packs",
    description: "Curated collections of content on specific healthcare topics like Value-Based Care, Digital Health, and M&A Activity.",
    color: "bg-purple-100 text-purple-600"
  },
  {
    icon: Lightbulb,
    title: "Topics Directory",
    description: "Browse and track healthcare topics. Watch topics to get alerts when new relevant content is added.",
    color: "bg-amber-100 text-amber-600"
  },
  {
    icon: Building2,
    title: "Companies Directory",
    description: "Track companies mentioned across newsletters. See M&A activity, funding rounds, and news related to specific organizations.",
    color: "bg-indigo-100 text-indigo-600"
  },
  {
    icon: Globe,
    title: "Various Sources",
    description: "Analyze any healthcare article or newsletter by URL or PDF upload. AI extracts key insights automatically.",
    color: "bg-pink-100 text-pink-600"
  },
  {
    icon: FolderOpen,
    title: "My Custom Packs",
    description: "Create your own collections by saving newsletters to custom packs for easy reference and sharing.",
    color: "bg-cyan-100 text-cyan-600"
  },
  {
    icon: FileText,
    title: "Deep Dive Reports",
    description: "Generate comprehensive AI-powered research reports on any topic or learning pack with a single click.",
    color: "bg-orange-100 text-orange-600"
  },
  {
    icon: Briefcase,
    title: "PE Meeting Prep",
    description: "Create PE-grade Initial Meeting Briefs for healthcare services and HCIT companies. AI generates 1-page briefs with business model analysis, key questions, and deal angles.",
    color: "bg-indigo-100 text-indigo-600"
  },
  {
    icon: Brain,
    title: "AI Agent Workspace",
    description: "Interact with specialized AI agents for insights analysis, strategic BD recommendations, and professional content formatting/export.",
    color: "bg-purple-100 text-purple-600"
  }
];

export default function KeyFeaturesModal({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            What This App Can Do
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <p className="text-slate-600 mb-6">
            HealthInsight is your AI-powered healthcare intelligence platform. Here's what you can do:
          </p>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${feature.color}`}>
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Pro Tip
            </h4>
            <p className="text-sm text-blue-800">
              Use the sidebar to navigate between sections. Start with the Knowledge Hub for an overview, 
              then explore Learning Packs to dive deep into specific healthcare topics.
            </p>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              Got it, let's explore!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}