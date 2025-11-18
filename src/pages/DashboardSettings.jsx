import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Save, BarChart3, Eye, Filter, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";

const defaultConfig = {
  visible_stats: ["newsletters", "ma_deals", "funding", "themes"],
  investment_focus: [],
  show_charts: true,
  newsletter_display: "full",
  filters_expanded: false
};

const statOptions = [
  { id: "newsletters", label: "Total Newsletters Analyzed", icon: "📊" },
  { id: "ma_deals", label: "M&A Deals Tracked", icon: "🤝" },
  { id: "funding", label: "Funding Rounds", icon: "💰" },
  { id: "themes", label: "Key Themes", icon: "🎯" }
];

const focusAreas = [
  "Digital Health",
  "Healthcare IT",
  "Medical Devices",
  "Biotech",
  "Telehealth",
  "Healthcare Services",
  "Health Insurance",
  "Hospital Systems",
  "Pharmacy",
  "Diagnostics",
  "Healthcare AI",
  "Clinical Trials"
];

export default function DashboardSettings() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(defaultConfig);
  const [customFocus, setCustomFocus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserConfig();
  }, []);

  const loadUserConfig = async () => {
    try {
      const user = await base44.auth.me();
      if (user.dashboard_config) {
        setConfig({ ...defaultConfig, ...user.dashboard_config });
      }
    } catch (err) {
      console.error("Error loading config:", err);
    }
    setIsLoading(false);
  };

  const toggleStat = (statId) => {
    setConfig(prev => ({
      ...prev,
      visible_stats: prev.visible_stats.includes(statId)
        ? prev.visible_stats.filter(id => id !== statId)
        : [...prev.visible_stats, statId]
    }));
  };

  const toggleFocus = (focus) => {
    setConfig(prev => ({
      ...prev,
      investment_focus: prev.investment_focus.includes(focus)
        ? prev.investment_focus.filter(f => f !== focus)
        : [...prev.investment_focus, focus]
    }));
  };

  const addCustomFocus = () => {
    if (customFocus.trim() && !config.investment_focus.includes(customFocus.trim())) {
      setConfig(prev => ({
        ...prev,
        investment_focus: [...prev.investment_focus, customFocus.trim()]
      }));
      setCustomFocus("");
    }
  };

  const removeFocus = (focus) => {
    setConfig(prev => ({
      ...prev,
      investment_focus: prev.investment_focus.filter(f => f !== focus)
    }));
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({ dashboard_config: config });
      toast.success("Dashboard preferences saved!");
      navigate(createPageUrl("Dashboard"));
    } catch (err) {
      toast.error("Failed to save preferences");
      console.error(err);
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="p-10 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-slate-200 rounded"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => navigate(createPageUrl("Dashboard"))}
        className="mb-6 hover:bg-slate-100"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Dashboard Settings</h1>
        <p className="text-slate-600 text-lg">Customize your dashboard to focus on what matters most</p>
      </div>

      <div className="space-y-6">
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
          <CardHeader className="border-b border-slate-200/60">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Visible Statistics
            </CardTitle>
            <CardDescription>Select which metrics to display on your dashboard</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              {statOptions.map(stat => (
                <div key={stat.id} className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                  <Checkbox
                    id={stat.id}
                    checked={config.visible_stats.includes(stat.id)}
                    onCheckedChange={() => toggleStat(stat.id)}
                  />
                  <Label htmlFor={stat.id} className="flex items-center gap-2 cursor-pointer flex-1">
                    <span className="text-xl">{stat.icon}</span>
                    <span className="text-sm font-medium">{stat.label}</span>
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
          <CardHeader className="border-b border-slate-200/60">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Investment Focus Areas
            </CardTitle>
            <CardDescription>Highlight content related to your investment interests</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              {focusAreas.map(area => (
                <Badge
                  key={area}
                  variant={config.investment_focus.includes(area) ? "default" : "outline"}
                  className={`cursor-pointer transition-colors ${
                    config.investment_focus.includes(area)
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "hover:bg-slate-100"
                  }`}
                  onClick={() => toggleFocus(area)}
                >
                  {area}
                </Badge>
              ))}
            </div>

            {config.investment_focus.length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-2">Your Selected Focus Areas:</p>
                <div className="flex flex-wrap gap-2">
                  {config.investment_focus.map(focus => (
                    <Badge key={focus} className="bg-purple-100 text-purple-800 border-purple-200 pr-1">
                      {focus}
                      <button
                        onClick={() => removeFocus(focus)}
                        className="ml-2 hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Add custom focus area..."
                value={customFocus}
                onChange={(e) => setCustomFocus(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomFocus()}
                className="flex-1"
              />
              <Button onClick={addCustomFocus} variant="outline">
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
          <CardHeader className="border-b border-slate-200/60">
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-green-600" />
              Newsletter Display
            </CardTitle>
            <CardDescription>Choose how newsletters are displayed</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <RadioGroup
              value={config.newsletter_display}
              onValueChange={(value) => setConfig(prev => ({ ...prev, newsletter_display: value }))}
            >
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 rounded-lg border border-slate-200">
                  <RadioGroupItem value="full" id="full" />
                  <Label htmlFor="full" className="cursor-pointer flex-1">
                    <div className="font-medium mb-1">Full Details</div>
                    <div className="text-sm text-slate-600">
                      Show summary, takeaways, themes, and all metadata
                    </div>
                  </Label>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg border border-slate-200">
                  <RadioGroupItem value="compact" id="compact" />
                  <Label htmlFor="compact" className="cursor-pointer flex-1">
                    <div className="font-medium mb-1">Compact</div>
                    <div className="text-sm text-slate-600">
                      Show summary and key metrics only
                    </div>
                  </Label>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg border border-slate-200">
                  <RadioGroupItem value="minimal" id="minimal" />
                  <Label htmlFor="minimal" className="cursor-pointer flex-1">
                    <div className="font-medium mb-1">Minimal</div>
                    <div className="text-sm text-slate-600">
                      Show title and date only - click for details
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
          <CardHeader className="border-b border-slate-200/60">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-orange-600" />
              Other Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg border border-slate-200">
                <Checkbox
                  id="show_charts"
                  checked={config.show_charts}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, show_charts: checked }))}
                />
                <Label htmlFor="show_charts" className="cursor-pointer flex-1">
                  <div className="font-medium mb-1">Show Analytics Charts</div>
                  <div className="text-sm text-slate-600">
                    Display visual charts and trend analysis
                  </div>
                </Label>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg border border-slate-200">
                <Checkbox
                  id="filters_expanded"
                  checked={config.filters_expanded}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, filters_expanded: checked }))}
                />
                <Label htmlFor="filters_expanded" className="cursor-pointer flex-1">
                  <div className="font-medium mb-1">Always Show Advanced Filters</div>
                  <div className="text-sm text-slate-600">
                    Keep filter panel expanded by default
                  </div>
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 sticky bottom-6 bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-slate-200 shadow-lg">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={saveConfig}
            disabled={isSaving}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}