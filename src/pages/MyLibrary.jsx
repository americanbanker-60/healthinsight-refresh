import React from "react";
import { Library } from "lucide-react";
import FavoritePacksSection from "../components/library/FavoritePacksSection";
import SavedSearchesSection from "../components/library/SavedSearchesSection";
import RecentlyViewedSection from "../components/library/RecentlyViewedSection";
import SavedSummariesSection from "../components/library/SavedSummariesSection";

export default function MyLibrary() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center">
            <Library className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">My Library</h1>
            <p className="text-slate-600 text-lg mt-1">
              Your personalized command center for research and discovery
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <FavoritePacksSection />
        <SavedSearchesSection />
        <RecentlyViewedSection />
        <SavedSummariesSection />
      </div>
    </div>
  );
}