import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Shield, Building2, Settings, Users, Newspaper,
  Database, Globe, Loader2, Trash2, Wrench
} from "lucide-react";
import { useUserRole, RoleGuard } from "../components/auth/RoleGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import BulkImportStatus from "../components/admin/BulkImportStatus";

export default function AdminDashboard() {
  const { user } = useUserRole();
  const queryClient = useQueryClient();
  const [deduping, setDeduping] = React.useState(false);
  const [fixingFlag, setFixingFlag] = React.useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const [newsletters, companies, sources, users] = await Promise.all([
        base44.entities.NewsletterItem.list("-created_date", 10000),
        base44.entities.Company.list(),
        base44.entities.Source.list(),
        base44.entities.User.list(),
      ]);
      const analyzed = (newsletters || []).filter(n => n.is_analyzed).length;
      return {
        articles: (newsletters || []).length,
        analyzed,
        companies: companies.length,
        sources: sources.filter(s => !s.is_deleted).length,
        users: users.length,
      };
    },
    initialData: { articles: 0, analyzed: 0, companies: 0, sources: 0, users: 0 },
  });

  const handleDedup = async () => {
    if (!confirm("Run deduplication scan? This will merge duplicate articles.")) return;
    setDeduping(true);
    try {
      const response = await base44.functions.invoke("deduplicateNewsletters", {});
      const data = response?.data ?? response;
      if (data?.success) {
        toast.success(`Merged ${data.merged} duplicate groups, deleted ${data.deleted} records`);
        queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      } else {
        toast.error("Deduplication failed");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setDeduping(false);
    }
  };

  const handleFixFlags = async () => {
    if (!confirm("Scan all articles and mark those with content as analyzed?")) return;
    setFixingFlag(true);
    try {
      const response = await base44.functions.invoke("fixAnalyzedFlag", {});
      const data = response?.data ?? response;
      if (data?.success) {
        toast.success(`Fixed ${data.newly_fixed} articles. ${data.already_flagged} were already correct.`);
        queryClient.invalidateQueries({ queryKey: ["adminStats"] });
        queryClient.invalidateQueries({ queryKey: ["newsletters"] });
      } else {
        toast.error("Fix failed");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setFixingFlag(false);
    }
  };

  const statCards = [
    { label: "Total Articles", value: stats.articles, sub: `${stats.analyzed} analyzed`, icon: Newspaper, color: "blue" },
    { label: "Companies", value: stats.companies, icon: Building2, color: "purple" },
    { label: "Sources", value: stats.sources, icon: Database, color: "green" },
    { label: "Users", value: stats.users, icon: Users, color: "orange" },
  ];

  const colorMap = {
    blue:   { card: "from-blue-50 to-blue-100 border-blue-200",   text: "text-blue-700",   icon: "text-blue-500" },
    purple: { card: "from-purple-50 to-purple-100 border-purple-200", text: "text-purple-700", icon: "text-purple-500" },
    green:  { card: "from-green-50 to-green-100 border-green-200", text: "text-green-700",  icon: "text-green-500" },
    orange: { card: "from-orange-50 to-orange-100 border-orange-200", text: "text-orange-700", icon: "text-orange-500" },
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm">{user?.email} · Administrator</p>
          </div>
        </div>

        {/* Stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map(({ label, value, sub, icon: Icon, color }) => {
              const c = colorMap[color];
              return (
                <Card key={label} className={`bg-gradient-to-br ${c.card}`}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`text-xs font-medium ${c.text} opacity-75 mb-1`}>{label}</p>
                        <p className={`text-3xl font-bold ${c.text}`}>{value}</p>
                        {sub && <p className={`text-xs ${c.text} opacity-60 mt-1`}>{sub}</p>}
                      </div>
                      <Icon className={`w-7 h-7 ${c.icon} opacity-40 mt-1`} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Bulk Import Queue */}
        <BulkImportStatus />

        {/* Maintenance */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-slate-500" />
            Maintenance
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">

            <Link to={createPageUrl("ManageSources")}>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Globe className="w-4 h-4 text-green-600" />
                Manage Sources
              </Button>
            </Link>

            <Link to={createPageUrl("DashboardSettings")}>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Settings className="w-4 h-4 text-slate-500" />
                Dashboard Settings
              </Button>
            </Link>

            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleDedup}
              disabled={deduping}
            >
              {deduping
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Trash2 className="w-4 h-4 text-red-400" />}
              {deduping ? "Running..." : "Deduplicate"}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleFixFlags}
              disabled={fixingFlag}
            >
              {fixingFlag
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Database className="w-4 h-4 text-amber-500" />}
              {fixingFlag ? "Running..." : "Fix Analyzed Flags"}
            </Button>

          </div>
        </div>

      </div>
    </RoleGuard>
  );
}
