import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to manage user settings with defaults
 */
export function useUserSettings() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: settingsList, isLoading } = useQuery({
    queryKey: ['userSettings', user?.email],
    queryFn: async () => {
      if (!user) return null;
      const settings = await base44.entities.UserSettings.filter({ created_by: user.email });
      return settings[0] || null;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const settings = settingsList || getDefaultSettings();

  async function updateSettings(updates) {
    if (!user) return;

    if (settingsList?.id) {
      // Update existing
      await base44.entities.UserSettings.update(settingsList.id, updates);
    } else {
      // Create new
      await base44.entities.UserSettings.create(updates);
    }
  }

  return {
    settings,
    isLoading,
    updateSettings,
    hasSettings: !!settingsList,
  };
}

export function getDefaultSettings() {
  return {
    default_landing_page: "knowledge_hub",
    default_date_range: "30d",
    preferred_sources: [],
    preferred_topics: [],
    notifications_enabled: true,
    email_notifications_enabled: false,
    watch_alert_frequency: "immediate",
    ai_output_verbosity: "standard",
    show_advanced_features: false,
    theme_preference: "light",
  };
}

/**
 * Get AI verbosity instructions based on user preference
 */
export function getVerbosityInstruction(verbosity) {
  switch (verbosity) {
    case "concise":
      return "Be very brief and concise. Use bullet points. Maximum 3-5 key points.";
    case "detailed":
      return "Provide comprehensive, detailed analysis with extensive context and multiple perspectives.";
    case "standard":
    default:
      return "";
  }
}