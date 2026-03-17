import React, { useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Brain, LayoutDashboard, Plus, TrendingUp, Settings, BookOpen, Library, Compass, Lightbulb, Building2, FolderOpen, Globe, Briefcase, ChevronDown, FileUp } from "lucide-react";
import { WalkthroughProvider, useWalkthrough } from "@/components/walkthrough/WalkthroughManager";
import { useUserRole } from "@/components/auth/RoleGuard";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, PlayCircle } from "lucide-react";
import { AdminBadge } from "@/components/admin/AdminOnlyButton";
import ErrorBoundary from "@/components/ErrorBoundary";
import AIResearchAssistant from "@/components/layout/AIResearchAssistant";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

const navigationGroups = [
  {
    label: "My Workspace",
    items: [
      {
        title: "Dashboard",
        url: createPageUrl("Dashboard"),
        icon: LayoutDashboard,
        roles: ["admin", "power", "user"],
      },
      {
        title: "My Library",
        url: createPageUrl("MyLibrary"),
        icon: Library,
        roles: ["admin", "power", "user"],
      },
      {
        title: "Research Folders",
        url: createPageUrl("MyCustomPacks"),
        icon: FolderOpen,
        roles: ["admin", "power", "user"],
      },
    ]
  },
  {
    label: "Discovery & Learning",
    items: [
      {
        title: "Knowledge Hub",
        url: createPageUrl("KnowledgeHub"),
        icon: Compass,
        roles: ["admin", "power", "user"],
      },
      {
        title: "Explore All Sources",
        url: createPageUrl("ExploreAllSources"),
        icon: TrendingUp,
        roles: ["admin", "power", "user"],
      },
      {
          title: "Companies",
          url: createPageUrl("CompaniesDirectory"),
          icon: Building2,
          roles: ["admin", "power", "user"],
        },
        {
          title: "Additional Publishers",
          url: createPageUrl("VariousSources"),
          icon: Globe,
          roles: ["admin", "power", "user"],
        },
    ]
  },
  {
    label: "Meeting Prep",
    items: [
      {
        title: "PE Meeting Prep",
        url: createPageUrl("PEMeetingPrep"),
        icon: Briefcase,
        roles: ["admin", "power", "user"],
      },
      {
        title: "Add to Library",
        url: createPageUrl("UploadPDF"),
        icon: FileUp,
        roles: ["admin", "power", "user"],
      },
    ]
  },
  {
    label: "AI Agents",
    items: [
      {
        title: "HealthInsight Assistant",
        url: createPageUrl("ResearchAssistant"),
        icon: Brain,
        roles: ["admin", "power", "user"],
      },
    ]
  },
  {
    label: "Settings",
    items: [
      {
        title: "User Settings",
        url: createPageUrl("UserSettings"),
        icon: Settings,
        roles: ["admin", "power", "user"],
      },
      {
        title: "Dashboard Settings",
        url: createPageUrl("DashboardSettings"),
        icon: Settings,
        roles: ["admin", "power"],
      },
    ]
  },
  {
    label: "Admin",
    adminOnly: true,
    items: [
      {
        title: "Admin Dashboard",
        url: createPageUrl("AdminDashboard"),
        icon: Shield,
        roles: ["admin"],
      },

      {
        title: "System Documentation",
        url: createPageUrl("SystemDocumentation"),
        icon: BookOpen,
        roles: ["admin"],
      },
    ]
  },
];

const COLLAPSED_STORAGE_KEY = "sidebar_collapsed_groups";
const DEFAULT_COLLAPSED = ["Settings", "Admin"];

function LayoutContent({ children, currentPageName, location }) {
  const { setOpen, isMobile } = useSidebar();
  const { role, isAdmin } = useUserRole();
  const { startWalkthrough } = useWalkthrough();

  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try {
      const stored = localStorage.getItem(COLLAPSED_STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_COLLAPSED;
    } catch {
      return DEFAULT_COLLAPSED;
    }
  });

  const toggleGroup = useCallback((label) => {
    setCollapsedGroups(prev => {
      const next = prev.includes(label)
        ? prev.filter(g => g !== label)
        : [...prev, label];
      try { localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Close sidebar on mobile when route changes
  React.useEffect(() => {
    if (isMobile) {
      setOpen(false);
    }
  }, [location.pathname, location.search, isMobile, setOpen]);

  const handleLinkClick = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full max-w-[100vw] overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        <style>{`
          * {
            overflow-wrap: break-word;
            max-width: 100%;
          }
          body {
            overflow-x: hidden;
          }
        `}</style>
        <style>{`
          :root {
            --primary: 222 47% 35%;
            --primary-foreground: 210 40% 98%;
            --accent: 217 91% 60%;
          }
        `}</style>
        
        <Sidebar className="border-r border-slate-200/60 bg-white/80 backdrop-blur-xl">
          <SidebarHeader className="border-b border-slate-200/60 p-6">
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691b51b50a00afcaf6fc0e9a/463ae1a89_image.png" 
                alt="HealthInsight Logo" 
                className="w-10 h-10 object-contain"
              />
              <div>
                <h2 className="font-semibold text-slate-900 text-lg tracking-tight">HealthInsight</h2>
                <p className="text-xs text-slate-500 font-medium">Healthcare Intelligence</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            {navigationGroups.filter(group => !group.adminOnly || isAdmin).map((group) => {
              const isCollapsed = collapsedGroups.includes(group.label);
              return (
                <SidebarGroup key={group.label}>
                  <SidebarGroupLabel
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3 flex items-center justify-between cursor-pointer hover:text-slate-700 transition-colors select-none"
                    onClick={() => toggleGroup(group.label)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{group.label}</span>
                      {group.adminOnly && <AdminBadge size="xs" />}
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                    />
                  </SidebarGroupLabel>
                  {!isCollapsed && (
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {group.items.map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              asChild
                              className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl mb-1 ${
                                location.pathname === item.url ? 'bg-blue-50 text-blue-700 shadow-sm' : ''
                              }`}
                            >
                              <Link to={item.url} onClick={handleLinkClick} className="flex items-center gap-3 px-4 py-3">
                                <item.icon className="w-4 h-4" />
                                <span className="font-medium">{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  )}
                </SidebarGroup>
              );
            })}
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200/60 p-4 space-y-3">
            <Button
              onClick={startWalkthrough}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              size="sm"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Start Tutorial
            </Button>

            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center">
                <span className="text-slate-600 font-semibold text-sm">U</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm truncate">Healthcare Analyst</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs px-2 py-0">
                    <Shield className="w-3 h-3 mr-1" />
                    {role === "admin" ? "Admin" : role === "power" ? "Power" : "User"}
                  </Badge>
                </div>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-x-hidden min-w-0 w-full">
          <header className="bg-white/60 backdrop-blur-xl border-b border-slate-200/60 px-4 md:px-6 py-4 md:hidden sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-semibold text-slate-900 truncate">HealthInsight</h1>
            </div>
          </header>

          <div className="flex-1 overflow-x-hidden overflow-y-auto w-full">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>

        <AIResearchAssistant currentPageName={currentPageName} />
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  // Render the landing page without sidebar/auth wrappers
  if (currentPageName === "LandingPage") {
    return (
      <ErrorBoundary>
        {children}
        <Toaster />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AdminGuard>
        <WalkthroughProvider>
          <SidebarProvider>
            <LayoutContent
              children={children}
              currentPageName={currentPageName}
              location={location}
            />
            <Toaster />
          </SidebarProvider>
        </WalkthroughProvider>
      </AdminGuard>
    </ErrorBoundary>
  );
}