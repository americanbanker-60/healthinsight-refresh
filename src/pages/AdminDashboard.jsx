import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Shield, Database, Lightbulb, Building2, BookOpen, Settings, Users, BarChart3, Newspaper, Calendar } from "lucide-react";
import { RoleGuard, useUserRole } from "../components/auth/RoleGuard";
import { Skeleton } from "@/components/ui/skeleton";
import EnhancedSourceScraper from "../components/admin/EnhancedSourceScraper";

export default function AdminDashboard() {
  const { user } = useUserRole();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const [newsletters, companies, sources, users] = await Promise.all([
        base44.entities.Newsletter.list(),
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
      <div className="p-4 md:p-6 lg:p-10 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
              <p className="text-slate-600 text-lg">System management and configuration</p>
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
          <div className="grid md:grid-cols-4 gap-4 mb-8">
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

        {/* Source Scraper */}
        <div className="mb-8">
          <EnhancedSourceScraper />
        </div>

        {/* Admin Actions */}
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Content Management</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 hover:shadow-xl transition-shadow flex flex-col">
            <CardHeader className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-green-600" />
                Newsletter Sources
              </CardTitle>
              <CardDescription>Add, edit, and categorize sources</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={createPageUrl("ManageSources")}>
                <Button className="w-full">Manage Sources</Button>
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
                <Calendar className="w-5 h-5 text-purple-600" />
                Publication Date Migration
              </CardTitle>
              <CardDescription>Extract actual publication dates from newsletters</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={createPageUrl("PublicationDateMigration")}>
                <Button className="w-full">Manage Dates</Button>
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