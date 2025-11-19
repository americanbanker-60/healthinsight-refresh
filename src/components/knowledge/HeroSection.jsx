import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, BookOpen, Library, Compass } from "lucide-react";

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-xl">
      <CardContent className="p-8 md:p-12">
        <div className="max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <Compass className="w-10 h-10" />
            <h1 className="text-4xl md:text-5xl font-bold">Welcome to the Knowledge Hub</h1>
          </div>
          <p className="text-xl text-blue-50 mb-8 leading-relaxed">
            Explore curated healthcare insights across newsletters, Learning Packs, and your personal library. 
            Choose a topic, run a search, or jump back into your work.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-start md:justify-between">
            <Button 
              size="lg"
              className="bg-white/20 backdrop-blur-sm text-white border border-white/40 hover:bg-white/30 hover:text-white"
              onClick={() => navigate(createPageUrl("ExploreAllSources"))}
            >
              <Search className="w-5 h-5 mr-2 text-white" />
              <span className="text-white">Explore All Sources</span>
            </Button>
            <Button 
              size="lg"
              className="bg-white/20 backdrop-blur-sm text-white border border-white/40 hover:bg-white/30 hover:text-white"
              onClick={() => navigate(createPageUrl("LearningPacks"))}
            >
              <BookOpen className="w-5 h-5 mr-2 text-white" />
              <span className="text-white">Browse Learning Packs</span>
            </Button>
            <Button 
              size="lg"
              className="bg-white/20 backdrop-blur-sm text-white border border-white/40 hover:bg-white/30 hover:text-white"
              onClick={() => navigate(createPageUrl("MyLibrary"))}
            >
              <Library className="w-5 h-5 mr-2 text-white" />
              <span className="text-white">Go to My Library</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}