import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { HelpCircle, BookOpen, Search, Library, Play, Sparkles } from "lucide-react";
import { useWalkthrough } from "../walkthrough/WalkthroughManager";

export default function HelpSection() {
  const navigate = useNavigate();
  const { startWalkthrough, hasCompletedWalkthrough } = useWalkthrough();

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
      <CardContent className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <HelpCircle className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">New Here? Learn How to Use This App</h2>
            <p className="text-slate-600">Get up to speed quickly with our guide</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="flex gap-3">
            <BookOpen className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Learning Packs</h3>
              <p className="text-sm text-slate-600">
                Curated collections of newsletters on specific topics. Open a pack to instantly explore relevant content.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Search className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Explore All Sources</h3>
              <p className="text-sm text-slate-600">
                Search and filter across all newsletters. Save your searches and generate summaries.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Library className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">My Library</h3>
              <p className="text-sm text-slate-600">
                Your personalized hub with favorites, saved searches, and activity insights.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={startWalkthrough} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Sparkles className="w-4 h-4 mr-2" />
            {hasCompletedWalkthrough ? "Replay Interactive Tour" : "Take Interactive Tour"}
          </Button>
          <Button variant="outline" onClick={() => navigate(createPageUrl("ExploreAllSources"))}>
            <Play className="w-4 h-4 mr-2" />
            Start Exploring
          </Button>
          <Button variant="outline" onClick={() => navigate(createPageUrl("MyLibrary"))}>
            View My Library
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}