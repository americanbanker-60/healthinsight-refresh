import React from "react";
import HeroSection from "../components/knowledge/HeroSection";
import FeaturedTopicsSection from "../components/knowledge/FeaturedTopicsSection";
import SourcesOverviewSection from "../components/knowledge/SourcesOverviewSection";
import ContinueSection from "../components/knowledge/ContinueSection";
import RecommendedSection from "../components/knowledge/RecommendedSection";
import HelpSection from "../components/knowledge/HelpSection";

export default function KnowledgeHub() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-10 space-y-8 md:space-y-12">
        <HeroSection />
        
        <section>
          <FeaturedTopicsSection />
        </section>

        <section>
          <SourcesOverviewSection />
        </section>

        <section>
          <ContinueSection />
        </section>

        <section>
          <RecommendedSection />
        </section>

        <section>
          <HelpSection />
        </section>
      </div>
    </div>
  );
}