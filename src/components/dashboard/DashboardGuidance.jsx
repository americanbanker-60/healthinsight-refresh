import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

export default function DashboardGuidance() {
  return (
    <Card className="bg-blue-50 border-blue-200 mb-8">
      <CardContent className="pt-6">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-blue-900">Understanding Your Data</p>
            <div className="text-blue-800 space-y-1">
              <p><strong>Sources</strong> are publishers you track (like Healthcare Finance News, Rock Health)</p>
              <p><strong>Newsletters</strong> are individual articles from those publishers</p>
              <p className="text-xs mt-2 text-blue-700">Creating a source does not automatically fetch newsletters. Use Admin Dashboard → Source Scraper to import content.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}