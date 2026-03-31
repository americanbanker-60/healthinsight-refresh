import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, TrendingUp, Building2, Lightbulb } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

export default function SmartSearchInput({ value, onChange, availableTopics = [], availableCompanies = [] }) {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      setAiSuggestions([]);
      return;
    }

    const searchLower = value.toLowerCase();
    const matchedTopics = availableTopics
      .filter(topic => topic.toLowerCase().includes(searchLower))
      .slice(0, 3)
      .map(topic => ({ type: 'topic', value: topic }));

    const matchedCompanies = availableCompanies
      .filter(company => company.toLowerCase().includes(searchLower))
      .slice(0, 3)
      .map(company => ({ type: 'company', value: company }));

    setSuggestions([...matchedTopics, ...matchedCompanies]);

    // Get AI suggestions after a delay
    const timer = setTimeout(() => {
      getAISuggestions(value);
    }, 800);

    return () => clearTimeout(timer);
  }, [value, availableTopics, availableCompanies]);

  const getAISuggestions = async (query) => {
    if (!query || query.length < 3) return;
    
    setIsLoadingAI(true);
    try {
      // Fetch analyzed newsletters to search themes and summaries
      const analyzedNewsletters = await base44.entities.NewsletterItem.filter(
        { is_analyzed: true },
        '-publication_date',
        1000
      );

      const queryLower = query.toLowerCase();
      const matchedThemesSet = new Set();
      
      // Extract themes and summaries matching the query
      analyzedNewsletters.forEach(n => {
        if (n.themes?.some(t => 
          t.theme?.toLowerCase().includes(queryLower) || 
          t.description?.toLowerCase().includes(queryLower)
        )) {
          n.themes.forEach(t => {
            if (t.theme && (t.theme.toLowerCase().includes(queryLower) || !queryLower.match(/^[a-z]/i))) {
              matchedThemesSet.add(t.theme);
            }
          });
        }
        if (n.summary?.toLowerCase().includes(queryLower)) {
          n.themes?.forEach(t => t.theme && matchedThemesSet.add(t.theme));
        }
      });

      const themeKeywords = Array.from(matchedThemesSet)
        .filter(t => t.toLowerCase() !== query.toLowerCase())
        .slice(0, 3)
        .map(theme => ({ type: 'ai', value: theme }));

      setAiSuggestions(themeKeywords);
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const allSuggestions = [...suggestions, ...aiSuggestions];

  const handleKeyDown = (e) => {
    if (!allSuggestions.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < allSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(allSuggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const selectSuggestion = (suggestion) => {
    onChange(suggestion.value);
    setIsFocused(false);
    setSelectedIndex(-1);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'topic': return <Lightbulb className="w-4 h-4 text-purple-500" />;
      case 'company': return <Building2 className="w-4 h-4 text-blue-500" />;
      case 'ai': return <Sparkles className="w-4 h-4 text-amber-500" />;
      default: return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'topic': return 'Topic';
      case 'company': return 'Company';
      case 'ai': return 'AI Suggestion';
      default: return '';
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
        <Input
          ref={inputRef}
          placeholder="Search titles, summaries, content... (AI-powered)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10 text-lg"
        />
        {isLoadingAI && (
          <div className="absolute right-3 top-3">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {isFocused && allSuggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden"
          >
            <div className="py-2">
              {allSuggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.value}`}
                  onClick={() => selectSuggestion(suggestion)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                    selectedIndex === index ? 'bg-blue-50' : ''
                  }`}
                >
                  {getIcon(suggestion.type)}
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-900">{suggestion.value}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {getTypeLabel(suggestion.type)}
                  </Badge>
                </button>
              ))}
            </div>
            
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-500">
              <TrendingUp className="w-3 h-3" />
              <span>Use ↑↓ to navigate, Enter to select, Esc to close</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}