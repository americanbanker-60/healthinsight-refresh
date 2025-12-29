import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import AICategorySuggestion from "./AICategorySuggestion";

const categories = ["Investment Banking", "Technology", "Finance", "Operations", "Policy", "General", "Other"];

export default function SourceEditor({ onCancel }) {
  const [formData, setFormData] = useState({ name: "", description: "", url: "", category: "General" });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Source.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      toast.success("Source created successfully");
      onCancel();
    },
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Source name is required");
      return;
    }
    createMutation.mutate({
      ...formData,
      is_deleted: false
    });
  };

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle>Add New Source</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Source name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <Textarea
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
        <Input
          placeholder="URL"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
        />

        {formData.url && (
          <AICategorySuggestion 
            url={formData.url} 
            name={formData.name}
            onSuggest={(category) => setFormData({ ...formData, category })}
          />
        )}

        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            <Check className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}