import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Lightbulb, Search, TrendingUp, Plus, X, ArrowUpDown } from "lucide-react";
import SortControl from "../components/common/SortControl";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AdminOnlyButton } from "../components/admin/AdminOnlyButton";

export default function TopicsDirectory() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTopic, setNewTopic] = useState({
    topic_name: "",
    description: "",
    keywords: [],
    icon: ""
  });
  const [keywordInput, setKeywordInput] = useState("");

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list("sort_order"),
    initialData: [],
  });

  const createTopicMutation = useMutation({
    mutationFn: (topicData) => base44.entities.Topic.create(topicData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      setShowAddDialog(false);
      resetForm();
      toast.success('Topic created successfully');
    },
  });

  const resetForm = () => {
    setNewTopic({
      topic_name: "",
      description: "",
      keywords: [],
      icon: ""
    });
    setKeywordInput("");
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !newTopic.keywords.includes(keywordInput.trim())) {
      setNewTopic({
        ...newTopic,
        keywords: [...newTopic.keywords, keywordInput.trim()]
      });
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword) => {
    setNewTopic({
      ...newTopic,
      keywords: newTopic.keywords.filter(k => k !== keyword)
    });
  };

  const handleSubmit = () => {
    if (!newTopic.topic_name.trim()) {
      toast.error('Topic name is required');
      return;
    }
    if (newTopic.keywords.length === 0) {
      toast.error('At least one keyword is required');
      return;
    }
    createTopicMutation.mutate(newTopic);
  };

  const filteredTopics = topics
    .filter(topic => {
      if (!searchText.trim()) return true;
      const search = searchText.toLowerCase();
      return (
        topic.topic_name?.toLowerCase().includes(search) ||
        topic.description?.toLowerCase().includes(search) ||
        topic.keywords?.some(k => k.toLowerCase().includes(search))
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_date || 0);
      const dateB = new Date(b.created_date || 0);
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  const openTopic = (topic) => {
    const params = new URLSearchParams({ id: topic.id });
    navigate(createPageUrl("TopicPage") + "?" + params.toString());
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-orange-600 rounded-xl flex items-center justify-center">
              <Lightbulb className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Topics Directory</h1>
              <p className="text-slate-600 text-lg mt-1">
                Explore healthcare topics with aggregated insights, news, and analysis
              </p>
            </div>
          </div>
          <AdminOnlyButton>
            <Button onClick={() => setShowAddDialog(true)} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Topic
            </Button>
          </AdminOnlyButton>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative max-w-xl flex-1 w-full">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search topics..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-10"
          />
        </div>
        <SortControl sortOrder={sortOrder} onSortChange={setSortOrder} />
      </div>

      {/* Topics Grid */}
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
      ) : filteredTopics.length === 0 ? (
        <Card className="text-center py-16">
          <Lightbulb className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            {searchText ? "No Topics Found" : "No Topics Yet"}
          </h3>
          <p className="text-slate-500">
            {searchText ? "Try a different search term" : "Topics will appear here once created"}
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTopics.map(topic => (
            <Card
              key={topic.id}
              className="bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 border-slate-200/60 group cursor-pointer"
              onClick={() => openTopic(topic)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-2">
                  {topic.icon && (
                    <div className="text-4xl mb-2">{topic.icon}</div>
                  )}
                </div>
                <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                  {topic.topic_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topic.description && (
                  <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                    {topic.description}
                  </p>
                )}
                
                {topic.keywords && topic.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {topic.keywords.slice(0, 3).map((keyword, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {topic.keywords.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{topic.keywords.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 group-hover:shadow-lg transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    openTopic(topic);
                  }}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Explore Topic
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Topic Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Topic</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="topic_name">Topic Name *</Label>
              <Input
                id="topic_name"
                value={newTopic.topic_name}
                onChange={(e) => setNewTopic({ ...newTopic, topic_name: e.target.value })}
                placeholder="e.g., Value-Based Care, AI in Healthcare"
              />
            </div>

            <div>
              <Label htmlFor="icon">Icon (emoji)</Label>
              <Input
                id="icon"
                value={newTopic.icon}
                onChange={(e) => setNewTopic({ ...newTopic, icon: e.target.value })}
                placeholder="💡"
                maxLength={2}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newTopic.description}
                onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                placeholder="Brief description of what this topic covers"
                rows={3}
              />
            </div>

            <div>
              <Label>Keywords * (used to match newsletter content)</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddKeyword())}
                  placeholder="e.g., VBC, value-based, capitation"
                />
                <Button onClick={handleAddKeyword} variant="outline">Add</Button>
              </div>
              {newTopic.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newTopic.keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveKeyword(keyword)}>
                      {keyword}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createTopicMutation.isPending}>
              {createTopicMutation.isPending ? "Creating..." : "Create Topic"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}