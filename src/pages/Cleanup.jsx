import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, RefreshCw, Copy, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { RoleGuard } from "../components/auth/RoleGuard";

export default function Cleanup() {
  const queryClient = useQueryClient();
  const [selectedSource, setSelectedSource] = useState("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ deleted: 0, updated: 0, skipped: 0 });

  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: () => base44.entities.Source.list("name"),
    initialData: [],
  });

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
      const filterQuery = selectedSource === "all" ? {} : { source_name: selectedSource };
      const sourceLabel = selectedSource === "all" ? "all sources" : selectedSource;
      
      addLog(`Fetching newsletters from ${sourceLabel}...`);
      const newsletters = await base44.entities.Newsletter.filter(
        filterQuery,
        "-created_date",
        500
      );

      addLog(`Found ${newsletters.length} newsletters from ${sourceLabel}`);

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

  const deduplicateNewsletters = async () => {
    setIsDeduplicating(true);
    setLogs([]);
    
    try {
      addLog('Starting deduplication scan...', 'info');
      const response = await base44.functions.invoke('deduplicateNewsletters', {});
      
      if (response.data.success) {
        addLog(`✅ ${response.data.message}`, 'success');
        addLog(`Found ${response.data.duplicateGroups} duplicate groups`, 'info');
        addLog(`Merged ${response.data.merged} newsletter groups`, 'update');
        addLog(`Deleted ${response.data.deleted} duplicate records`, 'delete');
        toast.success('Deduplication complete!');
      } else {
        addLog(`❌ Error: ${response.data.error}`, 'error');
        toast.error('Deduplication failed');
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      toast.error('Deduplication failed');
    }
    
    setIsDeduplicating(false);
  };

  const hardReset = async () => {
    setIsResetting(true);
    setLogs([]);
    
    const totalCounts = {
      newsletters: 0,
      sources: 0,
      relations: 0
    };
    
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    try {
      // 1. Delete NewsletterRelations
      addLog('Deleting newsletter relations...', 'info');
      const relations = await base44.entities.NewsletterRelation.list();
      for (let i = 0; i < relations.length; i++) {
        await base44.entities.NewsletterRelation.delete(relations[i].id);
        if ((i + 1) % 10 === 0) {
          addLog(`Deleted ${i + 1}/${relations.length} relations...`, 'info');
          await sleep(500); // 500ms delay every 10 deletions
        }
      }
      totalCounts.relations = relations.length;
      addLog(`✅ Deleted ${relations.length} newsletter relations`, 'delete');
      
      await sleep(1000); // 1 second pause between entity types
      
      // 2. Delete Newsletters
      addLog('Deleting newsletters...', 'info');
      const newsletters = await base44.entities.Newsletter.list();
      for (let i = 0; i < newsletters.length; i++) {
        await base44.entities.Newsletter.delete(newsletters[i].id);
        if ((i + 1) % 10 === 0) {
          addLog(`Deleted ${i + 1}/${newsletters.length} newsletters...`, 'info');
          await sleep(500); // 500ms delay every 10 deletions
        }
      }
      totalCounts.newsletters = newsletters.length;
      addLog(`✅ Deleted ${newsletters.length} newsletters`, 'delete');
      
      await sleep(1000); // 1 second pause between entity types
      
      // 3. Delete Sources
      addLog('Deleting sources...', 'info');
      const sources = await base44.entities.Source.list();
      for (let i = 0; i < sources.length; i++) {
        await base44.entities.Source.delete(sources[i].id);
        if ((i + 1) % 5 === 0) {
          addLog(`Deleted ${i + 1}/${sources.length} sources...`, 'info');
          await sleep(500); // 500ms delay every 5 deletions
        }
      }
      totalCounts.sources = sources.length;
      addLog(`✅ Deleted ${sources.length} sources`, 'delete');
      
      await sleep(1000);
      
      // Invalidate all queries
      addLog('Invalidating cached queries...', 'info');
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      queryClient.invalidateQueries();
      
      addLog('✅ Platform reset complete!', 'success');
      toast.success(`Reset complete: ${totalCounts.newsletters} newsletters, ${totalCounts.sources} sources, ${totalCounts.relations} relations deleted`);
      
    } catch (error) {
      addLog(`❌ Error during reset: ${error.message}`, 'error');
      toast.error(`Reset failed: ${error.message}`);
    }
    
    setIsResetting(false);
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Newsletter Cleanup Tool</h1>
        
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Hard Reset (Dangerous)
          </h3>
          <p className="text-sm text-red-800 mb-4">
            Permanently delete ALL newsletters, sources, and relations. This action cannot be undone. 
            Use only for complete platform overhaul.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={isResetting || isProcessing || isDeduplicating}
                variant="destructive"
                className="w-full"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting Platform...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Hard Reset Platform
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete ALL newsletters, sources, and relations from the database. 
                  This action cannot be undone. The platform will return to a clean state.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={hardReset} className="bg-red-600 hover:bg-red-700">
                  Yes, Delete Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Deduplication Tool</h3>
          <p className="text-sm text-blue-800 mb-4">
            Scan for duplicate newsletters (by URL or title) and merge their themes, key takeaways, and other data into a single record.
          </p>
          <Button
            onClick={deduplicateNewsletters}
            disabled={isDeduplicating || isProcessing}
            variant="outline"
            className="w-full"
          >
            {isDeduplicating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning for duplicates...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Run Deduplication
              </>
            )}
          </Button>
        </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Source</label>
        <Select value={selectedSource} onValueChange={setSelectedSource} disabled={isProcessing}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {sources.map(source => (
              <SelectItem key={source.id} value={source.name}>{source.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
    </RoleGuard>
  );
}