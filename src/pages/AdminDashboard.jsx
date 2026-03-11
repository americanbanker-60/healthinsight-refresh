import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Shield, Lightbulb, Building2, Settings, Users, BarChart3, Newspaper, Sparkles, Loader2, Database, Globe } from "lucide-react";
import { useUserRole, RoleGuard } from "../components/auth/RoleGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import IntelligenceOverhaul from "../components/admin/IntelligenceOverhaul";


export default function AdminDashboard() {
  const { user } = useUserRole();
  const queryClient = useQueryClient();
  const [generatingTopics, setGeneratingTopics] = React.useState(false);
  const [fixingFlag, setFixingFlag] = React.useState(false);

  const generateTopicsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('autoGenerateTopics');
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Generated ${data.topicsCreated} new topics!`);
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
    onError: (error) => {
      toast.error(`Failed to generate topics: ${error.message}`);
    },
  });

  const handleGenerateTopics = async () => {
    setGeneratingTopics(true);
    try {
      await generateTopicsMutation.mutateAsync();
    } finally {
      setGeneratingTopics(false);
    }
  };



  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const [newsletters, companies, sources, users] = await Promise.all([
        base44.entities.Newsletter.list('-updated_date', 10000),
        base44.entities.Company.list(),
        base44.entities.Source.list(),
        base44.entities.User.list()
      ]);
      return {
        newsletters: newsletters.length,
        companies: companies.length,
        sources: sources.filter(s => !s.is_deleted).length,
        users: users.length,
        admins: users.filter(u => u.role === 'admin').length
      };
    },
    initialData: { newsletters: 0, companies: 0, sources: 0, users: 0, admins: 0 }
  });

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
                <p className="text-slate-600 text-lg">System management and configuration</p>
              </div>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Administrator Access</p>
              <p className="text-xs text-amber-700 mt-1">
                You are logged in as <span className="font-semibold">{user?.email}</span>. 
                These controls affect the entire application and all users.
              </p>
            </div>
          </div>
        </div>

        {/* System Stats */}
        {isLoading ? (
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            {Array(4).fill(0).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Newsletters</p>
                    <p className="text-3xl font-bold text-blue-700">{stats.newsletters}</p>
                  </div>
                  <Newspaper className="w-8 h-8 text-blue-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-900">Companies</p>
                    <p className="text-3xl font-bold text-purple-700">{stats.companies}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-purple-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900">Sources</p>
                    <p className="text-3xl font-bold text-green-700">{stats.sources}</p>
                  </div>
                  <Database className="w-8 h-8 text-green-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-900">Users</p>
                    <p className="text-3xl font-bold text-orange-700">{stats.users}</p>
                  </div>
                  <Users className="w-8 h-8 text-orange-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Direct Newsletter Upload - Primary Action */}
        <div className="mb-6">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <Newspaper className="w-6 h-6 text-white" />
                </div>
                Add Newsletters
              </CardTitle>
              <CardDescription className="text-base">
                Paste newsletter URLs or upload PDFs to analyze and add to your database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={createPageUrl("ManageSources")}>
                <Button size="lg" className="w-full bg-green-600 hover:bg-green-700 text-lg py-6">
                  <Newspaper className="w-5 h-5 mr-2" />
                  Add Newsletters
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Intelligence Overhaul - Process Newsletters */}
        <div className="mb-6">
          <IntelligenceOverhaul />
        </div>

        {/* Admin Actions */}
        <h2 className="text-2xl font-bold text-slate-900 mb-4">System Management</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">

          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 hover:shadow-xl transition-shadow flex flex-col">
            <CardHeader className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-600" />
                Manage Sources
              </CardTitle>
              <CardDescription>Add and manage newsletter sources</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={createPageUrl("ManageSources")}>
                <Button className="w-full bg-green-600 hover:bg-green-700">Manage Sources</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 hover:shadow-xl transition-shadow flex flex-col">
            <CardHeader className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Companies
              </CardTitle>
              <CardDescription>Manage company metadata and profiles</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={createPageUrl("CompaniesDirectory")}>
                <Button className="w-full">Manage Companies</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 hover:shadow-xl transition-shadow flex flex-col">
            <CardHeader className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-600" />
                Dashboard Settings
              </CardTitle>
              <CardDescription>Configure dashboard display options</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={createPageUrl("DashboardSettings")}>
                <Button className="w-full">Dashboard Settings</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 hover:shadow-xl transition-shadow flex flex-col">
            <CardHeader className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                System Analytics
              </CardTitle>
              <CardDescription>View usage patterns and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 hover:shadow-xl transition-shadow flex flex-col">
            <CardHeader className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-600" />
                Data Cleanup
              </CardTitle>
              <CardDescription>Deduplicate newsletters and manage database integrity</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={async () => {
                  if (!confirm('Run deduplication scan? This will merge duplicate newsletters.')) return;
                  try {
                    const response = await base44.functions.invoke('deduplicateNewsletters', {});
                    if (response.data.success) {
                      toast.success(`Merged ${response.data.merged} duplicate groups, deleted ${response.data.deleted} records`);
                    } else {
                      toast.error('Deduplication failed');
                    }
                  } catch (error) {
                    toast.error(`Error: ${error.message}`);
                  }
                }}
                className="w-full"
              >
                Run Deduplication
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-lg hover:shadow-xl transition-shadow flex flex-col">
            <CardHeader className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-600" />
                Fix Dashboard Stats
              </CardTitle>
              <CardDescription>Mark all analyzed newsletters with the correct flag so they appear in dashboard stats and search</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                disabled={fixingFlag}
                onClick={async () => {
                  if (!confirm('This will scan all newsletters and mark those with content as analyzed. Run now?')) return;
                  setFixingFlag(true);
                  try {
                    const response = await base44.functions.invoke('fixAnalyzedFlag', {});
                    if (response.data.success) {
                      toast.success(`Fixed! ${response.data.newly_fixed} newsletters updated. ${response.data.already_flagged} were already correct.`);
                      queryClient.invalidateQueries({ queryKey: ['allNewslettersForStats'] });
                      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
                    } else {
                      toast.error('Fix failed');
                    }
                  } catch (error) {
                    toast.error(`Error: ${error.message}`);
                  } finally {
                    setFixingFlag(false);
                  }
                }}
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                {fixingFlag ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running Fix...</>
                ) : (
                  'Fix Analyzed Flag'
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 hover:shadow-xl transition-shadow flex flex-col">
            <CardHeader className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-600" />
                Auto-Generate Topics
              </CardTitle>
              <CardDescription>Create topics from your current sources</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleGenerateTopics}
                disabled={generatingTopics}
                className="w-full"
              >
                {generatingTopics ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Topics'
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 hover:shadow-xl transition-shadow flex flex-col">
            <CardHeader className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Content Generator
              </CardTitle>
              <CardDescription>Generate articles, summaries, and reports from newsletters</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={createPageUrl("AIContentGenerator")}>
                <Button className="w-full">Generate Content</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Security Notice */}
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <Shield className="w-5 h-5" />
              Security & Access Control
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-red-800 space-y-2">
            <p>
              <strong>Global Prompt Injection Defense:</strong> Active and cannot be disabled from UI. 
              All AI calls are protected.
            </p>
            <p>
              <strong>Role Management:</strong> Only admins can access this dashboard. Regular users cannot 
              view or modify global configurations.
            </p>
            <p>
              <strong>Data Integrity:</strong> Changes made here affect all users. Test carefully 
              before making major modifications.
            </p>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}