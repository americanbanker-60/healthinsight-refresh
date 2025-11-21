import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useUserSettings } from "../components/settings/UserSettingsManager";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Landing router that redirects to user's preferred landing page
 * Place this at the root route "/" to handle initial navigation
 */
export default function LandingRouter() {
  const navigate = useNavigate();
  const { settings, isLoading } = useUserSettings();

  useEffect(() => {
    if (!isLoading && settings) {
      const landingPage = settings.default_landing_page || "knowledge_hub";
      
      const pageMap = {
        knowledge_hub: "KnowledgeHub",
        explore: "ExploreAllSources",
        my_library: "MyLibrary",
        dashboard: "Dashboard"
      };

      const targetPage = pageMap[landingPage] || "KnowledgeHub";
      navigate(createPageUrl(targetPage), { replace: true });
    }
  }, [settings, isLoading, navigate]);

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <Skeleton className="h-12 w-1/3 mb-8" />
      <div className="grid gap-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}