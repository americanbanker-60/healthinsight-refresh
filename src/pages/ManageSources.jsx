import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { RoleGuard } from "../components/auth/RoleGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DirectNewsletterUpload from "../components/admin/DirectNewsletterUpload";
import CSVBulkImport from "../components/admin/CSVBulkImport";

export default function ManageSources() {



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
      <CSVBulkImport />
    </div>
    </RoleGuard>
  );
}