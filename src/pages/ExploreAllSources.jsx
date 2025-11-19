import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Calendar as CalendarIcon, Filter, X, Eye, BookOpen, AlertCircle } from "lucide-react";
import { format, subDays, startOfYear } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import NewsletterDetailModal from "../components/explore/NewsletterDetailModal";
import SummaryBuilder from "../components/explore/SummaryBuilder";
import SavedSearchesPanel from "../components/explore/SavedSearchesPanel";
import RecommendedPacks from "../components/packs/RecommendedPacks";
import RecentlyViewedPacks from "../components/packs/RecentlyViewedPacks";
import { logPackView } from "../utils/packTracking";
import { Link } from "react-router-dom";

const dateRangePresets = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Year to date", value: "ytd" },
  { label: "Custom", value: "custom" }
];

export default function ExploreAllSources() {
  const [searchText, setSearchText] = useState("");
  const [dateRangePreset, setDateRangePreset] = useState("30d");
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [topicInput, setTopicInput] = useState("");
  const [selectedNewsletters, setSelectedNewsletters] = useState([]);
  const [detailNewsletterId, setDetailNewsletterId] = useState(null);
  const [activePack, setActivePack] = useState(null);

  const { data: newsletters = [], isLoading } = useQuery({
    queryKey: ['all-newsletters'],
    queryFn: () => base44.entities.Newsletter.list("-publication_date", 500),
    initialData: [],
  });

  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: () => base44.entities.Source.list("name"),
    initialData: [],
  });

  const { data: learningPacks = [] } = useQuery({
    queryKey: ['learningPacks'],
    queryFn: () => base44.entities.LearningPack.list("sort_order"),
    initialData: [],
  });

  const availableSources = sources.filter(s => !s.data?.is_deleted).map(s => s.data.name);

  // Initialize with all sources selected
  React.useEffect(() => {
    if (availableSources.length > 0 && selectedSources.length === 0) {
      setSelectedSources(availableSources);
    }
  }, [availableSources]);

  // Load Learning Pack from URL params
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const packId = urlParams.get('pack_id');
    const packTitle = urlParams.get('pack_title');
    
    if (packId && learningPacks.length > 0) {
      const pack = learningPacks.find(p => p.id === packId);
      if (pack) {
        logPackView(packId);
        setSearchText(pack.keywords || "");
        setDateRangePreset(pack.date_range_type || "90d");
        setCustomStartDate(pack.custom_start_date ? new Date(pack.custom_start_date) : null);
        setCustomEndDate(pack.custom_end_date ? new Date(pack.custom_end_date) : null);
        setSelectedSources(pack.sources_selected && pack.sources_selected.length > 0 ? pack.sources_selected : availableSources);
        setSelectedTopics(pack.topics_selected || []);
        setSelectedNewsletters([]);
        setActivePack({ id: pack.id, title: packTitle || pack.pack_title });
      }
    }
  }, [learningPacks, availableSources]);

  // Get all unique topics from newsletters
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
        return { start: subDays(today, 30), end: today };
    }
  };

  const filteredResults = useMemo(() => {
    let results = newsletters;

    // Date filter
    const { start, end } = getDateRange();
    if (start && end) {
      results = results.filter(n => {
        const pubDate = n.publication_date ? new Date(n.publication_date) : new Date(n.created_date);
        return pubDate >= start && pubDate <= end;
      });
    }

    // Source filter
    if (selectedSources.length > 0) {
      results = results.filter(n => selectedSources.includes(n.source_name));
    }

    // Topics filter
    if (selectedTopics.length > 0) {
      results = results.filter(n => {
        if (!n.themes) return false;
        return n.themes.some(t => selectedTopics.includes(t.theme));
      });
    }

    // Search text filter
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      results = results.filter(n => {
        const inTitle = n.title?.toLowerCase().includes(search);
        const inSummary = n.summary?.toLowerCase().includes(search) || n.tldr?.toLowerCase().includes(search);
        const inTakeaways = n.key_takeaways?.some(t => t.toLowerCase().includes(search));
        const inThemes = n.themes?.some(t => 
          t.theme?.toLowerCase().includes(search) || 
          t.description?.toLowerCase().includes(search)
        );
        return inTitle || inSummary || inTakeaways || inThemes;
      });
    }

    return results;
  }, [newsletters, searchText, dateRangePreset, customStartDate, customEndDate, selectedSources, selectedTopics]);

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
    setDateRangePreset("30d");
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

  const detailNewsletter = newsletters.find(n => n.id === detailNewsletterId);

  return (
    <div className="p-6 md:p-10 max-w-[1800px] mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Explore All Sources</h1>
            <p className="text-slate-600 text-lg">Search and filter across all newsletter content</p>
          </div>
          <Link to={createPageUrl("LearningPacks")}>
            <Button variant="outline" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Browse Learning Packs
            </Button>
          </Link>
        </div>
        
        {activePack && (
          <div className="mt-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-purple-900">Learning Pack Active</p>
                <p className="text-sm text-purple-700">{activePack.title}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActivePack(null);
                window.history.replaceState({}, '', createPageUrl("ExploreAllSources"));
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RecentlyViewedPacks variant="compact" maxItems={5} />

          <RecommendedPacks
            currentPackId={activePack?.id}
            searchKeywords={searchText}
            selectedTopics={selectedTopics}
            selectedNewsletters={selectedNewsletters}
            newsletters={newsletters}
          />

          <SavedSearchesPanel
            currentSearch={currentSearchState}
            onLoadSearch={loadSavedSearch}
          />

        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 mb-6">
        <CardContent className="pt-6 space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search across titles, summaries, and content..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10 text-lg"
            />
          </div>

          {/* Filters */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Date Range */}
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
                <div className="mt-3 space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, 'MMM d, yyyy') : 'Start date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={customStartDate} onSelect={setCustomStartDate} />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, 'MMM d, yyyy') : 'End date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={customEndDate} onSelect={setCustomEndDate} />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Sources */}
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

            {/* Topics */}
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

        {/* Results */}
        <div className="mb-4 flex justify-between items-center">
        <p className="text-slate-600">
          <span className="font-semibold text-slate-900">{filteredResults.length}</span> results found
          {selectedNewsletters.length > 0 && (
            <span className="ml-2">• <span className="font-semibold text-blue-600">{selectedNewsletters.length}</span> selected</span>
          )}
        </p>
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
            const pubDate = newsletter.publication_date 
              ? new Date(newsletter.publication_date) 
              : new Date(newsletter.created_date);
            
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
                        <h3 className="text-lg font-semibold text-slate-900">{newsletter.title}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailNewsletterId(newsletter.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
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