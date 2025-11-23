import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminOnlyButton } from "../components/admin/AdminOnlyButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, Search, TrendingUp, Plus, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function CompaniesDirectory() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCompany, setNewCompany] = useState({
    company_name: "",
    description: "",
    known_aliases: [],
    primary_keywords: [],
    logo_url: ""
  });
  const [aliasInput, setAliasInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list("company_name"),
    initialData: [],
  });

  const createCompanyMutation = useMutation({
    mutationFn: (companyData) => base44.entities.Company.create(companyData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setShowAddDialog(false);
      resetForm();
      toast.success('Company added successfully');
    },
  });

  const resetForm = () => {
    setNewCompany({
      company_name: "",
      description: "",
      known_aliases: [],
      primary_keywords: [],
      logo_url: ""
    });
    setAliasInput("");
    setKeywordInput("");
  };

  const handleAddAlias = () => {
    if (aliasInput.trim() && !newCompany.known_aliases.includes(aliasInput.trim())) {
      setNewCompany({
        ...newCompany,
        known_aliases: [...newCompany.known_aliases, aliasInput.trim()]
      });
      setAliasInput("");
    }
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !newCompany.primary_keywords.includes(keywordInput.trim())) {
      setNewCompany({
        ...newCompany,
        primary_keywords: [...newCompany.primary_keywords, keywordInput.trim()]
      });
      setKeywordInput("");
    }
  };

  const handleRemoveAlias = (alias) => {
    setNewCompany({
      ...newCompany,
      known_aliases: newCompany.known_aliases.filter(a => a !== alias)
    });
  };

  const handleRemoveKeyword = (keyword) => {
    setNewCompany({
      ...newCompany,
      primary_keywords: newCompany.primary_keywords.filter(k => k !== keyword)
    });
  };

  const handleSubmit = () => {
    if (!newCompany.company_name.trim()) {
      toast.error('Company name is required');
      return;
    }
    createCompanyMutation.mutate(newCompany);
  };

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
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
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
          <AdminOnlyButton>
            <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
          </AdminOnlyButton>
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

      {/* Add Company Dialog */}
      <AdminOnlyButton>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Company</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={newCompany.company_name}
                onChange={(e) => setNewCompany({ ...newCompany, company_name: e.target.value })}
                placeholder="e.g., Epic Systems, UnitedHealth Group"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newCompany.description}
                onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                placeholder="Brief company description"
                rows={3}
              />
            </div>

            <div>
              <Label>Known Aliases</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAlias())}
                  placeholder="e.g., UHG for UnitedHealth Group"
                />
                <Button onClick={handleAddAlias} variant="outline">Add</Button>
              </div>
              {newCompany.known_aliases.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newCompany.known_aliases.map((alias) => (
                    <Badge key={alias} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveAlias(alias)}>
                      {alias}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Keywords to Track</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddKeyword())}
                  placeholder="Keywords to match in newsletters"
                />
                <Button onClick={handleAddKeyword} variant="outline">Add</Button>
              </div>
              {newCompany.primary_keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newCompany.primary_keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveKeyword(keyword)}>
                      {keyword}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="logo_url">Logo URL (optional)</Label>
              <Input
                id="logo_url"
                value={newCompany.logo_url}
                onChange={(e) => setNewCompany({ ...newCompany, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createCompanyMutation.isPending}>
              {createCompanyMutation.isPending ? "Adding..." : "Add Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </AdminOnlyButton>
    </div>
  );
}