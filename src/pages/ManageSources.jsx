import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { RoleGuard } from "../components/auth/RoleGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import SourceDatabaseFix from "../components/admin/SourceDatabaseFix";
import AISourceDiscovery from "../components/admin/AISourceDiscovery";
import DirectNewsletterUpload from "../components/admin/DirectNewsletterUpload";
import SourceUploadManager from "../components/admin/SourceUploadManager";
import SourceEditor from "../components/admin/SourceEditor";
import SourceList from "../components/admin/SourceList";

export default function ManageSources() {
  const [isAdding, setIsAdding] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: async () => {
      // Load all sources sorted by name
      const allSources = await base44.entities.Source.list("name", 1000);
      console.log(`✓ Loaded ${allSources.length} total sources from database`);
      return allSources;
    },
    initialData: [],
  });

  const deletedSources = sources.filter(s => s.is_deleted === true);



  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Manage Sources</h1>
          <p className="text-slate-600 text-lg">Organize and categorize your newsletter sources</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={showDeleted ? "default" : "outline"} 
            onClick={() => setShowDeleted(!showDeleted)}
            className={showDeleted ? "bg-amber-600 hover:bg-amber-700" : ""}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {showDeleted ? "Hide" : "Show"} Deleted ({deletedSources.length})
          </Button>
          <Button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Source
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <DirectNewsletterUpload />
      </div>

      <div className="mb-6">
        <SourceDatabaseFix />
      </div>

      <div className="mb-6">
        <AISourceDiscovery />
      </div>

      <div className="mb-6">
        <SourceUploadManager />
      </div>

      {isAdding && (
        <div className="mb-6">
          <SourceEditor onCancel={() => setIsAdding(false)} />
        </div>
      )}

      <SourceList 
        sources={showDeleted ? sources : sources.filter(s => !s.is_deleted)}
        showDeleted={showDeleted}
      />
    </div>
    </RoleGuard>
  );
}