import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, User, Bell, Zap, Shield, ChevronLeft } from "lucide-react";
import { useUserSettings } from "../components/settings/UserSettingsManager";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function UserSettings() {
  const queryClient = useQueryClient();
  const { settings, isLoading: settingsLoading, updateSettings } = useUserSettings();
  const { user } = useAuth();

  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: () => base44.entities.Source.list("name"),
    initialData: [],
  });

  const [formData, setFormData] = useState(settings);

  React.useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      await updateSettings(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('Settings saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save settings');
      console.error(error);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSource = (sourceName) => {
    const current = formData.preferred_sources || [];
    const updated = current.includes(sourceName)
      ? current.filter(s => s !== sourceName)
      : [...current, sourceName];
    updateField('preferred_sources', updated);
  };

  const roleLabels = {
    admin: { label: "Administrator", color: "bg-red-100 text-red-800 border-red-200" },
    power: { label: "Power User", color: "bg-purple-100 text-purple-800 border-purple-200" },
    standard: { label: "Standard User", color: "bg-blue-100 text-blue-800 border-blue-200" }
  };

  const userRole = user?.role || "standard";
  const roleInfo = roleLabels[userRole];

  if (settingsLoading || !user) {
    return (
      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        <Skeleton className="h-12 w-1/3 mb-8" />
        <div className="grid gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link to={createPageUrl("Dashboard")}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Button>
        </Link>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">User Settings</h1>
            <p className="text-slate-600 text-lg">Customize your experience and preferences</p>
          </div>
          <Badge className={`${roleInfo.color} border text-sm px-3 py-1.5`}>
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            {roleInfo.label}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile & Role */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Your account details and access level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <Input value={user.email} disabled className="mt-1.5 bg-slate-50" />
            </div>
            <div>
              <Label className="text-sm font-medium">Full Name</Label>
              <Input value={user.full_name || "Not set"} disabled className="mt-1.5 bg-slate-50" />
            </div>
            <div>
              <Label className="text-sm font-medium">Account Role</Label>
              <div className="mt-1.5">
                <Badge className={`${roleInfo.color} border text-sm px-3 py-1.5`}>
                  {roleInfo.label}
                </Badge>
                {userRole === "admin" && (
                  <p className="text-xs text-slate-500 mt-2">
                    You have full administrative access to the system.
                  </p>
                )}
                {userRole === "power" && (
                  <p className="text-xs text-slate-500 mt-2">
                    You have access to all user features and advanced capabilities.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation & Display */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
          <CardHeader>
            <CardTitle>Navigation & Display</CardTitle>
            <CardDescription>Control your default views and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium">Default Landing Page</Label>
              <Select 
                value={formData.default_landing_page} 
                onValueChange={(value) => updateField('default_landing_page', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="explore">Explore All Sources</SelectItem>
                  <SelectItem value="my_library">My Library</SelectItem>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1.5">Page to show when you first log in</p>
            </div>

            <div>
              <Label className="text-sm font-medium">Default Date Range</Label>
              <Select 
                value={formData.default_date_range} 
                onValueChange={(value) => updateField('default_date_range', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="ytd">Year to date</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1.5">Default time range for filtering content</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Show Advanced Features</Label>
                <p className="text-xs text-slate-500 mt-1">Display advanced UI panels and options</p>
              </div>
              <Switch
                checked={formData.show_advanced_features}
                onCheckedChange={(checked) => updateField('show_advanced_features', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preferred Sources */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
          <CardHeader>
            <CardTitle>Preferred Sources</CardTitle>
            <CardDescription>Select sources to prioritize in your feeds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sources.filter(s => !s.is_deleted).map(source => (
                <div key={source.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`source-${source.id}`}
                    checked={(formData.preferred_sources || []).includes(source.name)}
                    onChange={() => toggleSource(source.name)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor={`source-${source.id}`} className="cursor-pointer text-sm">
                    {source.name}
                  </Label>
                </div>
              ))}
            </div>
            {sources.filter(s => !s.is_deleted).length === 0 && (
              <p className="text-slate-500 text-sm">No sources available</p>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>Manage how you receive updates and alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">In-App Notifications</Label>
                <p className="text-xs text-slate-500 mt-1">Show notifications within the app</p>
              </div>
              <Switch
                checked={formData.notifications_enabled}
                onCheckedChange={(checked) => updateField('notifications_enabled', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Email Notifications</Label>
                <p className="text-xs text-slate-500 mt-1">Receive updates via email</p>
              </div>
              <Switch
                checked={formData.email_notifications_enabled}
                onCheckedChange={(checked) => updateField('email_notifications_enabled', checked)}
              />
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium">Watch Alert Frequency</Label>
              <Select 
                value={formData.watch_alert_frequency} 
                onValueChange={(value) => updateField('watch_alert_frequency', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="daily">Daily digest</SelectItem>
                  <SelectItem value="weekly">Weekly digest</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1.5">
                How often to alert you about watched topics
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI Preferences */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              AI & Analysis
            </CardTitle>
            <CardDescription>Customize how AI generates content for you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">AI Output Verbosity</Label>
              <Select 
                value={formData.ai_output_verbosity} 
                onValueChange={(value) => updateField('ai_output_verbosity', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concise">Concise (3-5 key points)</SelectItem>
                  <SelectItem value="standard">Standard (balanced)</SelectItem>
                  <SelectItem value="detailed">Detailed (comprehensive)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1.5">
                Controls the length and depth of AI-generated summaries and analyses
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}