import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Download, RefreshCw, Trash2, Play, RotateCcw } from "lucide-react";
import { Progress } from "@/components/ui/progress";

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes('\t') ? '\t' : ',';

  const parseRow = (line) => {
    const cols = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === delimiter && !inQuote) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    return cols;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  let urlCol = headers.findIndex(h => ['url', 'urls', 'link', 'links'].includes(h));
  if (urlCol === -1) {
    const firstData = parseRow(lines[1]);
    urlCol = firstData.findIndex(c => c.startsWith('http'));
  }
  if (urlCol === -1) urlCol = 0;
  const srcCol = headers.findIndex(h => ['source', 'sourcename', 'publisher', 'name'].includes(h));

  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i]);
    const url = row[urlCol]?.replace(/^["']|["']$/g, '').trim();
    if (url && url.startsWith('http')) {
      result.push({ url, sourceName: srcCol !== -1 ? row[srcCol]?.trim() : null });
    }
  }
  return result;
}

function BatchProgressCard({ batch, onDelete, onTrigger, onReprocessFailed }) {
  const total = batch.jobs.length;
  const done = batch.jobs.filter(j => j.status === 'done').length;
  const failed = batch.jobs.filter(j => j.status === 'failed').length;
  const skipped = batch.jobs.filter(j => j.status === 'skipped').length;
  const pending = batch.jobs.filter(j => j.status === 'pending').length;
  const processing = batch.jobs.filter(j => j.status === 'processing').length;
  const finished = done + failed + skipped;
  const pct = total > 0 ? Math.round((finished / total) * 100) : 0;
  const isComplete = pending === 0 && processing === 0;
  const failedJobs = batch.jobs.filter(j => j.status === 'failed');

  const downloadErrors = () => {
    const csv = 'url,error\n' + failedJobs.map(j => `"${j.url}","${j.error_message || ''}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `failed_${batch.id}.csv`;
    a.click();
  };

  return (
    <Card className="bg-white border border-slate-200">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800 text-sm">{batch.name}</p>
            <p className="text-xs text-slate-500">{total} URLs • uploaded {new Date(batch.created).toLocaleString()}</p>
          </div>
          <Badge variant={isComplete ? (failed > 0 ? "destructive" : "default") : "secondary"}>
            {isComplete ? (failed > 0 ? `Done (${failed} failed)` : "Complete") : `${pending + processing} left`}
          </Badge>
        </div>

        <Progress value={pct} className="h-2" />

        <div className="flex gap-4 text-xs">
          <span className="text-green-700">✓ {done} added</span>
          {skipped > 0 && <span className="text-slate-500">↷ {skipped} skipped</span>}
          {failed > 0 && <span className="text-red-600">✗ {failed} failed</span>}
          {!isComplete && <span className="text-blue-600">⏳ {pending + processing} pending</span>}
        </div>

        <div className="flex gap-2">
          {!isComplete && (
            <Button size="sm" variant="outline" onClick={() => onTrigger()} className="text-xs">
              <Play className="w-3 h-3 mr-1" /> Process Now
            </Button>
          )}
          {failedJobs.length > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={() => onReprocessFailed(batch.id)} className="text-xs text-orange-700 border-orange-300 hover:bg-orange-50">
                <RotateCcw className="w-3 h-3 mr-1" /> Reprocess Failed
              </Button>
              <Button size="sm" variant="outline" onClick={downloadErrors} className="text-xs">
                <Download className="w-3 h-3 mr-1" /> Download Failed
              </Button>
            </>
          )}
          {isComplete && (
            <Button size="sm" variant="ghost" onClick={() => onDelete(batch.id)} className="text-xs text-slate-400 hover:text-red-600">
              <Trash2 className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CSVBulkImport() {
  const [defaultSourceName, setDefaultSourceName] = useState('');
  const [fileName, setFileName] = useState('');
  const [enqueueing, setEnqueueing] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const queryClient = useQueryClient();

  // Poll for job status every 15s
  const { data: allJobs = [], refetch } = useQuery({
    queryKey: ['bulkImportJobs'],
    queryFn: () => base44.entities.BulkImportJob.list('-created_date', 2000),
    refetchInterval: 15000,
    initialData: []
  });

  // Group jobs by batch_id
  const batches = React.useMemo(() => {
    const map = {};
    for (const job of allJobs) {
      if (!map[job.batch_id]) {
        map[job.batch_id] = {
          id: job.batch_id,
          name: job.batch_name || job.batch_id,
          created: job.created_date,
          jobs: []
        };
      }
      map[job.batch_id].jobs.push(job);
    }
    return Object.values(map).sort((a, b) => new Date(b.created) - new Date(a.created));
  }, [allJobs]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCSV(text);
    e.target.value = '';

    if (parsed.length === 0) {
      toast.error('No valid URLs found in CSV. Make sure there is a column with URLs starting with "http".');
      return;
    }

    toast.info(`Found ${parsed.length} URLs — saving to queue...`);
    setEnqueueing(true);

    const batchId = `batch_${Date.now()}`;
    const batchName = file.name.replace(/\.csv$/i, '');

    // Bulk create all jobs
    const CHUNK = 100;
    try {
      for (let i = 0; i < parsed.length; i += CHUNK) {
        const slice = parsed.slice(i, i + CHUNK);
        await base44.entities.BulkImportJob.bulkCreate(
          slice.map(item => ({
            batch_id: batchId,
            batch_name: batchName,
            url: item.url,
            source_name: item.sourceName || defaultSourceName.trim() || null,
            status: 'pending'
          }))
        );
      }

      toast.success(`Queued ${parsed.length} URLs — processing will start automatically every 5 minutes, or click "Process Now"`);
      queryClient.invalidateQueries({ queryKey: ['bulkImportJobs'] });

      // Trigger immediately
      triggerProcessing();
    } catch (err) {
      toast.error(`Failed to queue URLs: ${err.message}`);
    } finally {
      setEnqueueing(false);
      setFileName('');
    }
  };

  const triggerProcessing = async () => {
    setTriggering(true);
    try {
      await base44.functions.invoke('processBulkImportQueue', {});
      refetch();
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const deleteBatch = async (batchId) => {
    const jobs = allJobs.filter(j => j.batch_id === batchId);
    for (const job of jobs) {
      await base44.entities.BulkImportJob.delete(job.id);
    }
    queryClient.invalidateQueries({ queryKey: ['bulkImportJobs'] });
    toast.success('Batch cleared');
  };

  const hasPendingJobs = allJobs.some(j => j.status === 'pending' || j.status === 'processing');

  return (
    <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-violet-600" />
            Bulk CSV Import
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={() => refetch()} className="text-slate-500">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-violet-100 border border-violet-300 rounded-lg p-4 text-sm">
          <p className="font-semibold text-violet-900 mb-1">📊 Import 500+ URLs from CSV</p>
          <p className="text-violet-800 text-xs leading-relaxed">
            Upload a CSV with a URL column. URLs are saved to a queue in the database — you can close the tab and come back. 
            Processing runs automatically every 5 minutes in the background.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Default Source Name (Optional)</Label>
          <Input
            placeholder="e.g., Elion Health — used if CSV has no source column"
            value={defaultSourceName}
            onChange={(e) => setDefaultSourceName(e.target.value)}
            disabled={enqueueing}
            className="bg-white"
          />
        </div>

        <label htmlFor="csv-upload-queue">
          <Button
            type="button"
            className="w-full bg-violet-600 hover:bg-violet-700"
            onClick={() => document.getElementById('csv-upload-queue')?.click()}
            disabled={enqueueing}
          >
            {enqueueing ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Saving to queue...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" />{fileName || 'Choose CSV File to Import'}</>
            )}
          </Button>
        </label>
        <input id="csv-upload-queue" type="file" accept=".csv,.tsv,.txt" onChange={handleFileChange} className="hidden" />

        {hasPendingJobs && (
          <Button
            variant="outline"
            className="w-full border-violet-300"
            onClick={triggerProcessing}
            disabled={triggering}
          >
            {triggering ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Processing...</>
            ) : (
              <><Play className="w-4 h-4 mr-2" />Process Pending Jobs Now</>
            )}
          </Button>
        )}

        {batches.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">Import Batches</p>
            {batches.map(batch => (
              <BatchProgressCard
                key={batch.id}
                batch={batch}
                onDelete={deleteBatch}
                onTrigger={triggerProcessing}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}