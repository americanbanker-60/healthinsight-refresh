import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, Eye, BookOpen, FileText } from "lucide-react";
import DateRangePicker from "../components/common/DateRangePicker";
import SortControl from "../components/common/SortControl";
import { format, subDays, startOfYear } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import NewsletterDetailModal from "../components/explore/NewsletterDetailModal";
import SummaryBuilder from "../components/explore/SummaryBuilder";
import SmartSearchInput from "../components/search/SmartSearchInput";
import SavedSearchesPanel from "../components/explore/SavedSearchesPanel";

const dateRangePresets = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Year to date", value: "ytd" },
  { label: "Custom", value: "custom" }
];

export default function ExploreAllSources() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchText, setSearchText] = useState("");
  const [dateRangePreset, setDateRangePreset] = useState("all");
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [topicInput, setTopicInput] = useState("");
  const [selectedNewsletters, setSelectedNewsletters] = useState([]);
  const [detailNewsletterId, setDetailNewsletterId] = useState(null);
  const [activePack, setActivePack] = useState(null);
  const [sortOrder, setSortOrder] = useState("newest");

  const { data: newsletters = [], isLoading } = useQuery({
    queryKey: ['all-newsletters'],
    queryFn: async () => {
      const response = await base44.functions.invoke('listNewsletters', {
        query: { is_analyzed: true },
        sort: '-publication_date',
        limit: 500
      });
      const data = response?.data ?? response;
      return data?.newsletters || [];
    },
    initialData: [],
  });

  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: () => base44.entities.Source.list("name"),
    initialData: [],
  });



  const availableSources = sources.filter(s => s && !s.is_deleted && s.name).map(s => s.name);

  // Initialize with all sources selected
  React.useEffect(() => {
    if (availableSources.length > 0 && selectedSources.length === 0) {
      setSelectedSources(availableSources);
    }
  }, [availableSources]);



  const allTopics = useMemo(() => {
    const topics = new Set();
    newsletters.forEach(n => {
      if (n.themes) {
        n.themes.forEach(t => topics.add(t.theme));
      }
    });
    return Array.from(topics).sort();
  }, [newsletters]);

  const getDateRange = () => {
    const today = new Date();
    switch (dateRangePreset) {
      case "all":
        return { start: null, end: null };
      case "7d":
        return { start: subDays(today, 7), end: today };
      case "30d":
        return { start: subDays(today, 30), end: today };
      case "90d":
        return { start: subDays(today, 90), end: today };
      case "ytd":
        return { start: startOfYear(today), end: today };
      case "custom":
        return { start: customStartDate, end: customEndDate };
      default:
        return { start: null, end: null };
    }
  };

  const currentPack = null;

  const filteredResults = useMemo(() => {
    let results = newsletters;

    const pinnedIds = currentPack?.pinned_newsletter_ids || [];
    const pinnedNewsletters = pinnedIds.length > 0 
      ? newsletters.filter(n => pinnedIds.includes(n.id))
      : [];

    const { start, end } = getDateRange();
    if (start && end) {
      results = results.filter(n => {
        const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
        return pubDate >= start && pubDate <= end;
      });
    }

    if (selectedSources.length > 0 && selectedSources.length < availableSources.length) {
      results = results.filter(n => selectedSources.includes(n.source_name));
    }

    if (selectedTopics.length > 0) {
      results = results.filter(n => {
        if (!n.themes) return false;
        return n.themes.some(t => selectedTopics.includes(t.theme));
      });
    }

    if (searchText && searchText.trim()) {
      const keywords = searchText.toLowerCase().split(/\s+/);
      results = results.filter(n => {
        const searchableText = [
          n.title || '',
          n.summary || '',
          n.tldr || '',
          ...(n.key_takeaways || []),
          ...(n.themes?.map(t => `${t.theme || ''} ${t.description || ''}`) || [])
        ].join(' ').toLowerCase();
        
        return keywords.some(keyword => keyword && searchableText.includes(keyword));
      });
    }

    const resultIds = new Set(results.map(n => n.id));
    const uniquePinned = pinnedNewsletters.filter(n => !resultIds.has(n.id));

    const combined = [...uniquePinned, ...results];

    return combined.sort((a, b) => {
      const dateA = new Date(a.publication_date || a.created_date || 0);
      const dateB = new Date(b.publication_date || b.created_date || 0);
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    }, [newsletters, searchText, dateRangePreset, customStartDate, customEndDate, selectedSources, selectedTopics, availableSources, currentPack, sortOrder]);

  React.useEffect(() => {
    const logActivity = async () => {
      if (searchText || selectedTopics.length > 0 || selectedSources.length < availableSources.length) {
        try {
          await base44.entities.UserSearchActivity.create({
            keywords: searchText,
            sources_selected: selectedSources,
            topics_selected: selectedTopics,
            date_range_type: dateRangePreset,
            results_count: filteredResults.length,
            executed_at: new Date().toISOString()
          });
        } catch (error) {
          console.error("Failed to log search activity:", error);
        }
      }
    };
    
    const timeoutId = setTimeout(logActivity, 2000);
    return () => clearTimeout(timeoutId);
  }, [searchText, selectedSources, selectedTopics, dateRangePreset, filteredResults.length, availableSources.length]);

  const toggleSource = (source) => {
    setSelectedSources(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
    setSelectedNewsletters([]);
  };

  const toggleTopic = (topic) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
    setSelectedNewsletters([]);
  };

  const addCustomTopic = () => {
    if (topicInput.trim() && !selectedTopics.includes(topicInput.trim())) {
      setSelectedTopics([...selectedTopics, topicInput.trim()]);
      setTopicInput("");
    }
  };

  const clearFilters = () => {
    setSearchText("");
    setDateRangePreset("all");
    setCustomStartDate(null);
    setCustomEndDate(null);
    setSelectedSources(availableSources);
    setSelectedTopics([]);
    setSelectedNewsletters([]);
  };

  const toggleNewsletterSelection = (id) => {
    setSelectedNewsletters(prev =>
      prev.includes(id) ? prev.filter(nId => nId !== id) : [...prev, id]
    );
  };

  const getSnippet = (newsletter) => {
    if (newsletter.tldr) return newsletter.tldr;
    if (newsletter.summary) return newsletter.summary.substring(0, 200) + "...";
    return "No summary available";
  };

  const loadSavedSearch = (savedSearch) => {
    setSearchText(savedSearch.keywords || "");
    setDateRangePreset(savedSearch.date_range_type || "30d");
    setCustomStartDate(savedSearch.custom_start_date ? new Date(savedSearch.custom_start_date) : null);
    setCustomEndDate(savedSearch.custom_end_date ? new Date(savedSearch.custom_end_date) : null);
    setSelectedSources(savedSearch.sources_selected || []);
    setSelectedTopics(savedSearch.topics_selected || []);
    setSelectedNewsletters([]);
  };

  const currentSearchState = {
    keywords: searchText,
    dateRangeType: dateRangePreset,
    customStartDate,
    customEndDate,
    sourcesSelected: selectedSources,
    topicsSelected: selectedTopics,
  };

  const generateDeepDive = () => {
    if (activePack) {
      const params = new URLSearchParams({
        pack_id: activePack.id,
        title: activePack.title
      });
      navigate(createPageUrl("DeepDiveResults") + "?" + params.toString());
    }
  };

  const detailNewsletter = newsletters.find(n => n.id === detailNewsletterId);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto overflow-x-hidden w-full">
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-2">Explore All Sources</h1>
            <p className="text-sm md:text-base text-slate-600 lg:text-lg">Search and filter across all newsletter content</p>
          </div>

        </div>
        

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 w-full">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <SavedSearchesPanel
            currentSearch={currentSearchState}
            onLoadSearch={loadSavedSearch}
          />

          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
            <CardContent className="pt-4 md:pt-6 space-y-4 md:space-y-6">
              <SmartSearchInput
                value={searchText}
                onChange={setSearchText}
                availableTopics={allTopics}
                availableCompanies={Array.from(new Set(newsletters.flatMap(n => n.key_players || [])))}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Date Range</Label>
                  <div className="space-y-2">
                    {dateRangePresets.map(preset => (
                      <div key={preset.value} className="flex items-center gap-2">
                        <Checkbox
                          id={preset.value}
                          checked={dateRangePreset === preset.value}
                          onCheckedChange={() => setDateRangePreset(preset.value)}
                        />
                        <Label htmlFor={preset.value} className="cursor-pointer text-sm">
                          {preset.label}
                        </Label>
                      </div>
                    ))}
                  </div>

                  {dateRangePreset === "custom" && (
                    <div className="mt-3">
                      <DateRangePicker
                        startDate={customStartDate}
                        endDate={customEndDate}
                        onStartDateChange={setCustomStartDate}
                        onEndDateChange={setCustomEndDate}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block">Sources</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableSources.map(source => (
                      <div key={source} className="flex items-center gap-2">
                        <Checkbox
                          id={`source-${source}`}
                          checked={selectedSources.includes(source)}
                          onCheckedChange={() => toggleSource(source)}
                        />
                        <Label htmlFor={`source-${source}`} className="cursor-pointer text-sm">
                          {source}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block">Topics</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type topic..."
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addCustomTopic()}
                        className="text-sm"
                      />
                      <Button onClick={addCustomTopic} size="sm" variant="outline">Add</Button>
                    </div>
                    {selectedTopics.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedTopics.map(topic => (
                          <Badge key={topic} variant="secondary" className="cursor-pointer" onClick={() => toggleTopic(topic)}>
                            {topic}
                            <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="max-h-40 overflow-y-auto space-y-1 border-t pt-2">
                      {allTopics.slice(0, 10).map(topic => (
                        <button
                          key={topic}
                          onClick={() => toggleTopic(topic)}
                          className={`text-xs px-2 py-1 rounded hover:bg-slate-100 transition-colors block w-full text-left ${
                            selectedTopics.includes(topic) ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
                          }`}
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={clearFilters} variant="outline" className="flex-1">
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <p className="text-slate-600">
              <span className="font-semibold text-slate-900">{filteredResults.length}</span> results found
              {selectedNewsletters.length > 0 && (
                <span className="ml-2">• <span className="font-semibold text-blue-600">{selectedNewsletters.length}</span> selected</span>
              )}
            </p>
            <SortControl sortOrder={sortOrder} onSortChange={setSortOrder} />
          </div>

          <div className="space-y-3">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <Card key={i} className="bg-white/80">
                  <CardContent className="pt-6">
                    <Skeleton className="h-6 w-2/3 mb-3" />
                    <Skeleton className="h-4 w-1/4 mb-3" />
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : (
              filteredResults.map(newsletter => {
                const pubDate = new Date(newsletter.publication_date);
                
                return (
                  <Card key={newsletter.id} className="bg-white/80 backdrop-blur-sm hover:shadow-md transition-shadow border-slate-200/60">
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <Checkbox
                          checked={selectedNewsletters.includes(newsletter.id)}
                          onCheckedChange={() => toggleNewsletterSelection(newsletter.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-semibold text-slate-900 flex-1">{newsletter.title}</h3>
                            <div className="flex gap-2">
                              {currentPack?.pinned_newsletter_ids?.includes(newsletter.id) && (
                                <Badge className="bg-blue-100 text-blue-700 border-blue-300">Pinned</Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDetailNewsletterId(newsletter.id)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-600 mb-3">
                            <Badge variant="outline">{newsletter.source_name}</Badge>
                            <span>{format(pubDate, "MMM d, yyyy")}</span>
                            {newsletter.sentiment && (
                              <Badge className="bg-slate-100 text-slate-700">{newsletter.sentiment}</Badge>
                            )}
                          </div>
                          <p className="text-slate-700 text-sm leading-relaxed">{getSnippet(newsletter)}</p>
                          {newsletter.themes && newsletter.themes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {newsletter.themes.slice(0, 4).map((theme, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {theme.theme}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <SummaryBuilder
            selectedNewsletters={selectedNewsletters}
            newsletters={newsletters}
            searchText={searchText}
            dateRange={getDateRange()}
            activePack={activePack}
          />
        </div>
      </div>

      {detailNewsletter && (
        <NewsletterDetailModal
          newsletter={detailNewsletter}
          onClose={() => setDetailNewsletterId(null)}
        />
      )}
    </div>
  );
}