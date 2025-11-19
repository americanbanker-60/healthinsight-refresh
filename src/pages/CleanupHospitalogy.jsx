import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CleanupHospitalogy() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ deleted: 0, updated: 0, skipped: 0 });

  const addLog = (message, type = "info") => {
    setLogs(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
  };

  const extractDateFromUrl = (url) => {
    // Extract date from URLs like: https://hospitalogy.com/articles/2025-01-14/...
    const match = url.match(/\/(\d{4}-\d{2}-\d{2})\//);
    return match ? match[1] : null;
  };

  const isBlankNewsletter = (newsletter) => {
    // Check if newsletter is truly blank (no meaningful content)
    const hasTitle = newsletter.title && !newsletter.title.match(/^Newsletter \d+$/);
    const hasSummary = newsletter.summary && newsletter.summary.length > 50;
    const hasTldr = newsletter.tldr && newsletter.tldr.length > 20;
    const hasTakeaways = newsletter.key_takeaways && newsletter.key_takeaways.length > 0;
    
    return !hasTitle && !hasSummary && !hasTldr && !hasTakeaways;
  };

  const cleanupNewsletters = async () => {
    setIsProcessing(true);
    setLogs([]);
    setStats({ deleted: 0, updated: 0, skipped: 0 });

    try {
      addLog("Fetching all Hospitalogy newsletters...");
      const newsletters = await base44.entities.Newsletter.filter(
        { source_name: "Hospitalogy" },
        "-created_date",
        500
      );

      addLog(`Found ${newsletters.length} Hospitalogy newsletters`);

      for (const newsletter of newsletters) {
        // Check if blank
        if (isBlankNewsletter(newsletter)) {
          addLog(`Deleting blank newsletter: ${newsletter.title || newsletter.id}`, "delete");
          await base44.entities.Newsletter.delete(newsletter.id);
          setStats(prev => ({ ...prev, deleted: prev.deleted + 1 }));
          continue;
        }

        // Check if date needs fixing
        const urlDate = extractDateFromUrl(newsletter.source_url);
        const currentDate = newsletter.publication_date;
        
        if (urlDate && currentDate !== urlDate) {
          addLog(`Fixing date for "${newsletter.title}": ${currentDate} → ${urlDate}`, "update");
          await base44.entities.Newsletter.update(newsletter.id, {
            publication_date: urlDate
          });
          setStats(prev => ({ ...prev, updated: prev.updated + 1 }));
        } else {
          setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
        }
      }

      addLog("✅ Cleanup complete!", "success");
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, "error");
    }

    setIsProcessing(false);
  };

  return (
    <div className="p-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Hospitalogy Newsletter Cleanup</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-red-600">{stats.deleted}</div>
            <div className="text-sm text-slate-600">Deleted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-blue-600">{stats.updated}</div>
            <div className="text-sm text-slate-600">Updated</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-slate-600">{stats.skipped}</div>
            <div className="text-sm text-slate-600">Skipped</div>
          </CardContent>
        </Card>
      </div>

      <Button
        onClick={cleanupNewsletters}
        disabled={isProcessing}
        className="w-full mb-6"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <RefreshCw className="w-5 h-5 mr-2" />
            Start Cleanup
          </>
        )}
      </Button>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">Activity Log</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <Badge
                  variant={
                    log.type === "delete" ? "destructive" :
                    log.type === "update" ? "default" :
                    log.type === "success" ? "default" :
                    log.type === "error" ? "destructive" :
                    "outline"
                  }
                  className="mt-0.5 shrink-0"
                >
                  {log.time}
                </Badge>
                <span className={
                  log.type === "delete" ? "text-red-600" :
                  log.type === "update" ? "text-blue-600" :
                  log.type === "success" ? "text-green-600" :
                  log.type === "error" ? "text-red-600" :
                  "text-slate-700"
                }>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}