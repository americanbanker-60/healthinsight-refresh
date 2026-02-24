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
      <div className="mb-8">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-8 text-white shadow-xl">
          <h1 className="text-4xl font-bold mb-3">Add Newsletters</h1>
          <p className="text-green-100 text-lg">Paste newsletter URLs or upload PDFs to analyze instantly</p>
        </div>
      </div>

      <DirectNewsletterUpload />
    </div>
    </RoleGuard>
  );
}