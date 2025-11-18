import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Filter, X, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

export default function AdvancedFilters({ newsletters, onFiltersChange }) {
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    keywords: "",
    keyPlayer: "",
    dealValueMin: "",
    dealValueMax: "",
    fundingStage: "all",
    sentiment: "all"
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Extract unique key players from all newsletters
  const allKeyPlayers = [...new Set(
    newsletters.flatMap(n => n.key_players || [])
  )].sort();

  // Extract unique funding stages
  const allFundingStages = [...new Set(
    newsletters.flatMap(n => 
      (n.funding_rounds || []).map(f => f.round_type)
    ).filter(Boolean)
  )].sort();

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      startDate: null,
      endDate: null,
      keywords: "",
      keyPlayer: "",
      dealValueMin: "",
      dealValueMax: "",
      fundingStage: "all",
      sentiment: "all"
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'sentiment' || key === 'fundingStage') return value !== 'all';
    return value !== null && value !== '';
  }).length;

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 mb-6">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Quick Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search keywords in takeaways, summaries, themes..."
                value={filters.keywords}
                onChange={(e) => handleFilterChange('keywords', e.target.value)}
                className="h-10"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              {["all", "positive", "neutral", "negative", "mixed"].map((sentiment) => (
                <Button
                  key={sentiment}
                  variant={filters.sentiment === sentiment ? "default" : "outline"}
                  onClick={() => handleFilterChange('sentiment', sentiment)}
                  className={`capitalize text-xs px-3 ${
                    filters.sentiment === sentiment 
                      ? "bg-blue-600 text-white" 
                      : "hover:bg-slate-50"
                  }`}
                  size="sm"
                >
                  {sentiment}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="relative"
              size="sm"
            >
              <Filter className="w-4 h-4 mr-2" />
              Advanced
              {activeFilterCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-blue-600">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                size="sm"
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date Range</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.startDate ? format(filters.startDate, "MMM d") : "Start"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.startDate}
                        onSelect={(date) => handleFilterChange('startDate', date)}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.endDate ? format(filters.endDate, "MMM d") : "End"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.endDate}
                        onSelect={(date) => handleFilterChange('endDate', date)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Key Player */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Key Player/Company</Label>
                <Select value={filters.keyPlayer} onValueChange={(value) => handleFilterChange('keyPlayer', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All companies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All companies</SelectItem>
                    {allKeyPlayers.slice(0, 50).map((player) => (
                      <SelectItem key={player} value={player}>
                        {player}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Funding Stage */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Funding Stage</Label>
                <Select value={filters.fundingStage} onValueChange={(value) => handleFilterChange('fundingStage', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stages</SelectItem>
                    {allFundingStages.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Deal Value Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">M&A Deal Value Range</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Min $M"
                    type="number"
                    value={filters.dealValueMin}
                    onChange={(e) => handleFilterChange('dealValueMin', e.target.value)}
                    className="h-9"
                  />
                  <Input
                    placeholder="Max $M"
                    type="number"
                    value={filters.dealValueMax}
                    onChange={(e) => handleFilterChange('dealValueMax', e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}