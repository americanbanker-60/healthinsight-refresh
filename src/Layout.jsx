import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Brain, LayoutDashboard, Plus, TrendingUp, Settings, Newspaper, BookOpen, Library, Compass } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
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
} from "@/components/ui/sidebar";

const staticNavigationItems = [
  {
    title: "Knowledge Hub",
    url: createPageUrl("KnowledgeHub"),
    icon: Compass,
  },
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "My Library",
    url: createPageUrl("MyLibrary"),
    icon: Library,
  },
  {
    title: "Learning Packs",
    url: createPageUrl("LearningPacks"),
    icon: BookOpen,
  },
  {
    title: "Explore All Sources",
    url: createPageUrl("ExploreAllSources"),
    icon: TrendingUp,
  },
  {
    title: "Manage Sources",
    url: createPageUrl("ManageSources"),
    icon: Settings,
  },
  {
    title: "Settings",
    url: createPageUrl("DashboardSettings"),
    icon: Settings,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  
  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: () => base44.entities.Source.list("name"),
    initialData: [],
  });

  // Filter out deleted sources and group by category
  const activeSourcesByCategory = React.useMemo(() => {
    const active = sources.filter(s => !s.is_deleted);
    const grouped = {};
    active.forEach(source => {
      const category = source.category || "General";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(source);
    });
    return grouped;
  }, [sources]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
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
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
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
                    {activeSourcesByCategory[category].map((source) => (
                      <SidebarMenuItem key={source.id}>
                        <SidebarMenuButton 
                          asChild 
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl mb-1 ${
                            location.pathname === createPageUrl("SourcePage") && location.search.includes(source.name) ? 'bg-blue-50 text-blue-700 shadow-sm' : ''
                          }`}
                        >
                          <Link to={createPageUrl("SourcePage") + "?name=" + encodeURIComponent(source.name)} className="flex items-center gap-3 px-4 py-3">
                            <Newspaper className="w-4 h-4" />
                            <span className="font-medium">{source.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
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
                <p className="text-xs text-slate-500 truncate">Newsletter Intelligence</p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white/60 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 md:hidden sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-semibold text-slate-900">HealthInsight</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}