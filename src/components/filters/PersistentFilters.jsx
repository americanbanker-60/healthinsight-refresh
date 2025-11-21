import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Calendar as CalendarIcon, X, Filter, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const STORAGE_KEY = 'healthinsight_filters';

export default function PersistentFilters({ 
  onFilterChange, 
  availableThemes = [], 
  availableCompanies = [],
  showSourceFilter = false,
  availableSources = []
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState(() => {
    // Load from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return getDefaultFilters();
      }
    }
    return getDefaultFilters();
  });

  function getDefaultFilters() {
    return {
      keywords: "",
      startDate: null,
      endDate: null,
      sentiments: [],
      themes: [],
      companies: [],
      sources: []
    };
  }

  // Save to localStorage whenever filters change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    onFilterChange(filters);
  }, [filters]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value]
    }));
  };

  const clearFilters = () => {
    setFilters(getDefaultFilters());
  };

  const hasActiveFilters = 
    filters.keywords || 
    filters.startDate || 
    filters.endDate || 
    filters.sentiments.length > 0 || 
    filters.themes.length > 0 || 
    filters.companies.length > 0 ||
    filters.sources.length > 0;

  const activeFilterCount = 
    (filters.keywords ? 1 : 0) +
    (filters.startDate || filters.endDate ? 1 : 0) +
    filters.sentiments.length +
    filters.themes.length +
    filters.companies.length +
    filters.sources.length;

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 mb-6">
      <CardContent className="pt-4 pb-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Filter className="w-4 h-4" />
                  <span className="font-semibold">Advanced Filters</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
                  )}
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {/* Quick Search - Always Visible */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search keywords..."
              value={filters.keywords}
              onChange={(e) => updateFilter('keywords', e.target.value)}
              className="pl-10"
            />
          </div>

          <CollapsibleContent className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Date Range</Label>
                <div className="space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.startDate ? format(new Date(filters.startDate), 'MMM d, yyyy') : 'Start date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.startDate ? new Date(filters.startDate) : undefined}
                        onSelect={(date) => updateFilter('startDate', date?.toISOString())}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.endDate ? format(new Date(filters.endDate), 'MMM d, yyyy') : 'End date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.endDate ? new Date(filters.endDate) : undefined}
                        onSelect={(date) => updateFilter('endDate', date?.toISOString())}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Sentiment */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Sentiment</Label>
                <div className="space-y-2">
                  {['positive', 'neutral', 'negative', 'mixed'].map(sentiment => (
                    <div key={sentiment} className="flex items-center gap-2">
                      <Checkbox
                        id={`sentiment-${sentiment}`}
                        checked={filters.sentiments.includes(sentiment)}
                        onCheckedChange={() => toggleArrayFilter('sentiments', sentiment)}
                      />
                      <Label htmlFor={`sentiment-${sentiment}`} className="cursor-pointer capitalize text-sm">
                        {sentiment}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Themes */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Themes</Label>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {availableThemes.slice(0, 20).map(theme => (
                    <div key={theme} className="flex items-center gap-2">
                      <Checkbox
                        id={`theme-${theme}`}
                        checked={filters.themes.includes(theme)}
                        onCheckedChange={() => toggleArrayFilter('themes', theme)}
                      />
                      <Label htmlFor={`theme-${theme}`} className="cursor-pointer text-sm">
                        {theme}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Companies */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Companies</Label>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {availableCompanies.slice(0, 20).map(company => (
                    <div key={company} className="flex items-center gap-2">
                      <Checkbox
                        id={`company-${company}`}
                        checked={filters.companies.includes(company)}
                        onCheckedChange={() => toggleArrayFilter('companies', company)}
                      />
                      <Label htmlFor={`company-${company}`} className="cursor-pointer text-sm">
                        {company}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sources (conditional) */}
              {showSourceFilter && availableSources.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Sources</Label>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {availableSources.map(source => (
                      <div key={source} className="flex items-center gap-2">
                        <Checkbox
                          id={`source-${source}`}
                          checked={filters.sources.includes(source)}
                          onCheckedChange={() => toggleArrayFilter('sources', source)}
                        />
                        <Label htmlFor={`source-${source}`} className="cursor-pointer text-sm">
                          {source}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Active Filter Tags */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {filters.sentiments.map(sentiment => (
                  <Badge key={sentiment} variant="secondary" className="gap-1">
                    {sentiment}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => toggleArrayFilter('sentiments', sentiment)}
                    />
                  </Badge>
                ))}
                {filters.themes.map(theme => (
                  <Badge key={theme} variant="secondary" className="gap-1">
                    {theme}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => toggleArrayFilter('themes', theme)}
                    />
                  </Badge>
                ))}
                {filters.companies.map(company => (
                  <Badge key={company} variant="secondary" className="gap-1">
                    {company}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => toggleArrayFilter('companies', company)}
                    />
                  </Badge>
                ))}
                {filters.sources.map(source => (
                  <Badge key={source} variant="secondary" className="gap-1">
                    {source}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => toggleArrayFilter('sources', source)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export function applyFilters(newsletters, filters) {
  let filtered = newsletters;

  // Keywords
  if (filters.keywords?.trim()) {
    const keywords = filters.keywords.toLowerCase().split(/\s+/);
    filtered = filtered.filter(n => {
      const searchableText = [
        n.title || '',
        n.summary || '',
        n.tldr || '',
        ...(n.key_takeaways || []),
        ...(n.themes?.map(t => `${t.theme} ${t.description}`) || []),
        ...(n.key_players || [])
      ].join(' ').toLowerCase();
      return keywords.some(kw => searchableText.includes(kw));
    });
  }

  // Date Range
  if (filters.startDate) {
    const start = new Date(filters.startDate);
    filtered = filtered.filter(n => {
      const date = new Date(n.publication_date || n.created_date);
      return date >= start;
    });
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    filtered = filtered.filter(n => {
      const date = new Date(n.publication_date || n.created_date);
      return date <= end;
    });
  }

  // Sentiment
  if (filters.sentiments?.length > 0) {
    filtered = filtered.filter(n => filters.sentiments.includes(n.sentiment));
  }

  // Themes
  if (filters.themes?.length > 0) {
    filtered = filtered.filter(n => {
      if (!n.themes) return false;
      return n.themes.some(t => filters.themes.includes(t.theme));
    });
  }

  // Companies
  if (filters.companies?.length > 0) {
    filtered = filtered.filter(n => {
      if (!n.key_players) return false;
      return n.key_players.some(p => filters.companies.includes(p));
    });
  }

  // Sources
  if (filters.sources?.length > 0) {
    filtered = filtered.filter(n => filters.sources.includes(n.source_name));
  }

  return filtered;
}