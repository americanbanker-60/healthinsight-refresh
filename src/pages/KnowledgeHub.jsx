import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useHealthcareIntelligence } from "../components/utils/useHealthcareIntelligence";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Building2, ArrowRight, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function KnowledgeHub() {
  const { allNewsletters, isLoading, availableThemes, availableCompanies } = useHealthcareIntelligence({
    maxItems: 1000,
  });

  // Calculate theme counts
  const themesWithCounts = React.useMemo(() => {
    const themeCounts = {};
    allNewsletters.forEach(newsletter => {
      newsletter.themes?.forEach(theme => {
        if (theme.theme) {
          themeCounts[theme.theme] = (themeCounts[theme.theme] || 0) + 1;
        }
      });
    });
    return Object.entries(themeCounts)
      .map(([theme, count]) => ({ theme, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [allNewsletters]);

  // Calculate company counts
  const companiesWithCounts = React.useMemo(() => {
    const companyCounts = {};
    allNewsletters.forEach(newsletter => {
      newsletter.key_players?.forEach(company => {
        if (company) {
          companyCounts[company] = (companyCounts[company] || 0) + 1;
        }
      });
    });
    return Object.entries(companyCounts)
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [allNewsletters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900">Knowledge Hub</h1>
          </div>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Explore emerging themes and key players across healthcare intelligence
          </p>
        </div>

        {/* Emerging Themes Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">Emerging Themes</h2>
            </div>
            <Link to={createPageUrl("TopicsDirectory")}>
              <Badge variant="outline" className="cursor-pointer hover:bg-blue-50 transition-colors">
                View All
                <ArrowRight className="w-3 h-3 ml-1" />
              </Badge>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : themesWithCounts.length === 0 ? (
            <Card className="bg-white/60 backdrop-blur-sm border-slate-200">
              <CardContent className="p-8 text-center">
                <p className="text-slate-500">No themes found. Analyze newsletters to discover emerging themes.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {themesWithCounts.map(({ theme, count }) => (
                <Link key={theme} to={createPageUrl(`TopicPage?topic=${encodeURIComponent(theme)}`)}>
                  <Card className="bg-white/60 backdrop-blur-sm border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer h-full">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-start justify-between gap-2">
                        <span className="line-clamp-2">{theme}</span>
                        <Badge variant="secondary" className="shrink-0">
                          {count}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Mentioned in {count} newsletter{count !== 1 ? 's' : ''}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Key Players Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-bold text-slate-900">Key Players (Companies)</h2>
            </div>
            <Link to={createPageUrl("CompaniesDirectory")}>
              <Badge variant="outline" className="cursor-pointer hover:bg-indigo-50 transition-colors">
                View All
                <ArrowRight className="w-3 h-3 ml-1" />
              </Badge>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : companiesWithCounts.length === 0 ? (
            <Card className="bg-white/60 backdrop-blur-sm border-slate-200">
              <CardContent className="p-8 text-center">
                <p className="text-slate-500">No companies found. Analyze newsletters to identify key players.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companiesWithCounts.map(({ company, count }) => (
                <Link key={company} to={createPageUrl(`CompanyPage?company=${encodeURIComponent(company)}`)}>
                  <Card className="bg-white/60 backdrop-blur-sm border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all duration-200 cursor-pointer h-full">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-start justify-between gap-2">
                        <span className="line-clamp-2">{company}</span>
                        <Badge variant="secondary" className="shrink-0">
                          {count}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Mentioned in {count} newsletter{count !== 1 ? 's' : ''}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}