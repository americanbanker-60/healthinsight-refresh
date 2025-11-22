import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Brain, LayoutDashboard, Plus, TrendingUp, Settings, Newspaper, BookOpen, Library, Compass, Lightbulb, Building2, FolderOpen } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { WalkthroughProvider } from "@/components/walkthrough/WalkthroughManager";
import { useUserRole } from "@/components/auth/RoleGuard";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
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

const staticNavigationItems = [
  {
    title: "Knowledge Hub",
    url: createPageUrl("KnowledgeHub"),
    icon: Compass,
    roles: ["admin", "power", "standard"],
  },
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
    roles: ["admin", "power", "standard"],
  },
  {
    title: "Explore All Sources",
    url: createPageUrl("ExploreAllSources"),
    icon: TrendingUp,
    roles: ["admin", "power", "standard"],
  },
  {
    title: "Learning Packs",
    url: createPageUrl("LearningPacks"),
    icon: BookOpen,
    roles: ["admin", "power", "standard"],
  },
  {
    title: "Topics",
    url: createPageUrl("TopicsDirectory"),
    icon: Lightbulb,
    roles: ["admin", "power", "standard"],
  },
  {
    title: "Companies",
    url: createPageUrl("CompaniesDirectory"),
    icon: Building2,
    roles: ["admin", "power", "standard"],
  },
  {
    title: "My Library",
    url: createPageUrl("MyLibrary"),
    icon: Library,
    roles: ["admin", "power", "standard"],
  },
  {
    title: "My Custom Packs",
    url: createPageUrl("MyCustomPacks"),
    icon: FolderOpen,
    roles: ["admin", "power", "standard"],
  },
  {
    title: "Admin Panel",
    url: createPageUrl("AdminPanel"),
    icon: Shield,
    roles: ["admin"],
  },
  {
    title: "Manage Sources",
    url: createPageUrl("ManageSources"),
    icon: Settings,
    roles: ["admin"],
  },
  {
    title: "Dashboard Settings",
    url: createPageUrl("DashboardSettings"),
    icon: Settings,
    roles: ["admin", "power"],
  },
  {
    title: "User Settings",
    url: createPageUrl("UserSettings"),
    icon: Settings,
    roles: ["admin", "power", "standard"],
  },
];

function LayoutContent({ children, currentPageName, location, sources }) {
  const { setOpen, isMobile } = useSidebar();
  const { role } = useUserRole();

  // Close sidebar on mobile when route changes
  React.useEffect(() => {
    if (isMobile) {
      setOpen(false);
    }
  }, [location.pathname, location.search, isMobile, setOpen]);

  const handleLinkClick = () => {
    // Close sidebar on mobile when a link is clicked
    if (isMobile) {
      setOpen(false);
    }
  };

  const activeSourcesByCategory = React.useMemo(() => {
    if (!sources || !Array.isArray(sources)) return {};
    
    const active = sources.filter(s => s && typeof s === 'object' && !s.is_deleted && s.name && s.id);
    const grouped = {};
    active.forEach(source => {
      const category = source.category || "General";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(source);
    });
    return grouped;
  }, [sources]);

  return (
    <div className="min-h-screen flex w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        <style>{`
          * {
            overflow-wrap: break-word;
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
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 text-lg tracking-tight">HealthInsight</h2>
                <p className="text-xs text-slate-500 font-medium">Healthcare Intelligence</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {staticNavigationItems.map((item) => (
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
            </SidebarGroup>

            {Object.keys(activeSourcesByCategory).sort().map(category => (
              <SidebarGroup key={category} className="mt-4">
                <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                  {category}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {activeSourcesByCategory[category]?.map((source) => source && source.id && source.name ? (
                      <SidebarMenuItem key={source.id}>
                        <SidebarMenuButton 
                          asChild 
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl mb-1 ${
                            location.pathname === createPageUrl("SourcePage") && location.search.includes(source.name) ? 'bg-blue-50 text-blue-700 shadow-sm' : ''
                          }`}
                        >
                          <Link to={createPageUrl("SourcePage") + "?name=" + encodeURIComponent(source.name)} onClick={handleLinkClick} className="flex items-center gap-3 px-4 py-3">
                            <Newspaper className="w-4 h-4" />
                            <span className="font-medium">{source.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ) : null)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200/60 p-4">
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center">
                <span className="text-slate-600 font-semibold text-sm">U</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm truncate">Healthcare Analyst</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs px-2 py-0">
                    <Shield className="w-3 h-3 mr-1" />
                    {role === "admin" ? "Admin" : role === "power" ? "Power" : "Standard"}
                  </Badge>
                </div>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-x-hidden">
          <header className="bg-white/60 backdrop-blur-xl border-b border-slate-200/60 px-4 md:px-6 py-4 md:hidden sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-semibold text-slate-900 truncate">HealthInsight</h1>
            </div>
          </header>

          <div className="flex-1 overflow-x-hidden overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
      );
      }

      export default function Layout({ children, currentPageName }) {
      const location = useLocation();

      const { data: sources = [] } = useQuery({
      queryKey: ['sources'],
      queryFn: () => base44.entities.Source.list("name"),
      initialData: [],
      });

      return (
      <WalkthroughProvider>
        <SidebarProvider>
          <LayoutContent 
            children={children} 
            currentPageName={currentPageName}
            location={location}
            sources={sources}
          />
        </SidebarProvider>
      </WalkthroughProvider>
      );
      }