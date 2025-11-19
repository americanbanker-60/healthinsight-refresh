import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, Search, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompaniesDirectory() {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list("company_name"),
    initialData: [],
  });

  const filteredCompanies = companies.filter(company => {
    if (!searchText.trim()) return true;
    const search = searchText.toLowerCase();
    return (
      company.company_name?.toLowerCase().includes(search) ||
      company.description?.toLowerCase().includes(search) ||
      company.known_aliases?.some(a => a.toLowerCase().includes(search))
    );
  });

  const openCompany = (company) => {
    const params = new URLSearchParams({ id: company.id });
    navigate(createPageUrl("CompanyPage") + "?" + params.toString());
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Companies Directory</h1>
            <p className="text-slate-600 text-lg mt-1">
              Explore healthcare companies with aggregated intelligence and activity
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search companies..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Companies Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCompanies.length === 0 ? (
        <Card className="text-center py-16">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            {searchText ? "No Companies Found" : "No Companies Yet"}
          </h3>
          <p className="text-slate-500">
            {searchText ? "Try a different search term" : "Companies will appear here once created"}
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map(company => (
            <Card
              key={company.id}
              className="bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 border-slate-200/60 group cursor-pointer"
              onClick={() => openCompany(company)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3 mb-2">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt={company.company_name} className="w-12 h-12 rounded object-contain bg-white p-1 border border-slate-200" />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                      {company.company_name}
                    </CardTitle>
                    {company.known_aliases && company.known_aliases.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {company.known_aliases.slice(0, 2).map((alias, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {alias}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {company.description && (
                  <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                    {company.description}
                  </p>
                )}

                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 group-hover:shadow-lg transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCompany(company);
                  }}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Company Profile
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}