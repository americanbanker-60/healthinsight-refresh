import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { RoleGuard } from "../components/auth/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Shield, 
  Settings, 
  BookOpen, 
  Lightbulb, 
  Building2, 
  Newspaper,
  Brain,
  BarChart3,
  Users,
  Sparkles,
  Wrench,
  TrendingUp,
  Database
} from "lucide-react";
import SourceScraperPanel from "../components/admin/SourceScraperPanel";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const [newsletters, packs, topics, companies, sources, users] = await Promise.all([
        base44.entities.Newsletter.list(),
        base44.entities.LearningPack.list(),
        base44.entities.Topic.list(),
        base44.entities.Company.list(),
        base44.entities.Source.list(),
        base44.entities.User.list(),
      ]);

      return {
        newsletters: newsletters.length,
        packs: packs.length,
        topics: topics.length,
        companies: companies.length,
        sources: sources.filter(s => !s.is_deleted).length,
        users: users.length,
        admins: users.filter(u => u.role === "admin").length,
      };
    },
    initialData: { newsletters: 0, packs: 0, topics: 0, companies: 0, sources: 0, users: 0, admins: 0 },
  });

  const sections = [
    {
      title: "Content Management",
      icon: Database,
      color: "from-blue-600 to-blue-700",
      cards: [
        {
          title: "Newsletter Sources",
          description: "Manage newsletter sources and categories",
          icon: Newspaper,
          link: createPageUrl("ManageSources"),
          stat: `${stats.sources} active sources`,
          color: "text-blue-600"
        },
        {
          title: "Learning Packs",
          description: "Create and manage global learning packs",
          icon: BookOpen,
          link: createPageUrl("ManageLearningPacks"),
          stat: `${stats.packs} packs`,
          color: "text-purple-600"
        },
        {
          title: "Topics Directory",
          description: "Manage topics and their metadata",
          icon: Lightbulb,
          link: createPageUrl("TopicsDirectory"),
          stat: `${stats.topics} topics`,
          color: "text-amber-600"
        },
        {
          title: "Companies Directory",
          description: "Manage companies and tracking keywords",
          icon: Building2,
          link: createPageUrl("CompaniesDirectory"),
          stat: `${stats.companies} companies`,
          color: "text-blue-600"
        },
      ]
    },
    {
      title: "Configuration & Settings",
      icon: Settings,
      color: "from-slate-600 to-slate-700",
      cards: [
        {
          title: "Dashboard Settings",
          description: "Configure dashboard display and preferences",
          icon: BarChart3,
          link: createPageUrl("DashboardSettings"),
          stat: "Display settings",
          color: "text-slate-600"
        },
        {
          title: "Data Cleanup Tools",
          description: "Maintain data quality and fix issues",
          icon: Wrench,
          link: createPageUrl("Cleanup"),
          stat: "Maintenance",
          color: "text-red-600"
        },
      ]
    },
    {
      title: "AI & Intelligence",
      icon: Brain,
      color: "from-purple-600 to-purple-700",
      cards: [
        {
          title: "AI Trend Discovery",
          description: "View and manage AI-generated trend suggestions",
          icon: Sparkles,
          link: createPageUrl("Dashboard"),
          stat: "On Dashboard",
          color: "text-purple-600"
        },
        {
          title: "AI Configuration",
          description: "Configure AI agents and prompt settings",
          icon: Brain,
          link: null,
          stat: "Coming soon",
          color: "text-gray-400",
          disabled: true
        },
      ]
    },
    {
      title: "System & Users",
      icon: Users,
      color: "from-green-600 to-green-700",
      cards: [
        {
          title: "User Management",
          description: "View and manage user accounts and roles",
          icon: Users,
          link: null,
          stat: `${stats.users} users (${stats.admins} admin)`,
          color: "text-green-600",
          disabled: true
        },
        {
          title: "Analytics & Reports",
          description: "View system usage and analytics",
          icon: TrendingUp,
          link: null,
          stat: "Coming soon",
          color: "text-gray-400",
          disabled: true
        },
      ]
    }
  ];

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="p-4 md:p-6 lg:p-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <Shield className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
              <p className="text-sm md:text-base lg:text-lg text-slate-600 mt-1">
                Central hub for system administration and configuration
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-4">
            <Badge className="bg-red-100 text-red-700 border-red-200">
              <Shield className="w-3 h-3 mr-1" />
              Admin Access Only
            </Badge>
            <Badge variant="outline">
              {stats.newsletters} newsletters analyzed
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        {!isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-blue-900">{stats.sources}</p>
                    <p className="text-sm text-blue-600">Sources</p>
                  </div>
                  <Newspaper className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-purple-900">{stats.packs}</p>
                    <p className="text-sm text-purple-600">Learning Packs</p>
                  </div>
                  <BookOpen className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-amber-900">{stats.topics}</p>
                    <p className="text-sm text-amber-600">Topics</p>
                  </div>
                  <Lightbulb className="w-8 h-8 text-amber-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-900">{stats.users}</p>
                    <p className="text-sm text-green-600">Users</p>
                  </div>
                  <Users className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Newsletter Scraper */}
        <SourceScraperPanel />

        {/* Admin Sections */}
        <div className="space-y-8">
          {sections.map((section) => {
            const SectionIcon = section.icon;
            return (
              <div key={section.title}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 bg-gradient-to-br ${section.color} rounded-lg flex items-center justify-center`}>
                    <SectionIcon className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">{section.title}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {section.cards.map((card) => {
                    const CardIcon = card.icon;
                    const CardContent = (
                      <Card 
                        className={`bg-white/80 backdrop-blur-sm border-slate-200/60 ${
                          !card.disabled ? 'hover:shadow-xl transition-all duration-300 cursor-pointer' : 'opacity-60'
                        }`}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                                <CardIcon className={`w-6 h-6 ${card.color}`} />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{card.title}</CardTitle>
                                <CardDescription className="mt-1">{card.description}</CardDescription>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {card.stat}
                            </Badge>
                            {!card.disabled && (
                              <Button variant="ghost" size="sm" className="text-blue-600">
                                Manage →
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );

                    if (card.disabled || !card.link) {
                      return <div key={card.title}>{CardContent}</div>;
                    }

                    return (
                      <Link key={card.title} to={card.link}>
                        {CardContent}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Notice */}
        <Card className="mt-8 bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Admin Area - Security Notice</h3>
                <p className="text-sm text-red-700 leading-relaxed">
                  This dashboard provides access to system-wide configuration and data management tools. 
                  Changes made here affect all users. Always verify actions before proceeding.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}