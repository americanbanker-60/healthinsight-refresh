import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, StopCircle, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const CONCURRENCY = 3;

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];

  // Detect delimiter
  const delimiter = lines[0].includes('\t') ? '\t' : ',';

  const rows = lines.map(line => {
    // Handle quoted fields
    const cols = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === delimiter && !inQuote) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    return cols;
  });

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // Find URL column: prefer column named 'url', otherwise first column containing http
  let urlColIndex = headers.findIndex(h => h === 'url' || h === 'urls' || h === 'link' || h === 'links');
  if (urlColIndex === -1) {
    // Scan first data row for a column that looks like a URL
    const firstData = rows[1];
    urlColIndex = firstData.findIndex(cell => cell.startsWith('http'));
  }
  if (urlColIndex === -1) urlColIndex = 0;

  // Find source_name column if present
  let sourceColIndex = headers.findIndex(h => h === 'source' || h === 'sourcename' || h === 'publisher' || h === 'name');

  const urls = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const url = row[urlColIndex]?.replace(/^["']|["']$/g, '').trim();
    if (url && url.startsWith('http')) {
      urls.push({
        url,
        sourceName: sourceColIndex !== -1 ? row[sourceColIndex]?.trim() : null
      });
    }
  }
  return urls;
}

export default function CSVBulkImport() {
  const [parsedUrls, setParsedUrls] = useState([]);
  const [fileName, setFileName] = useState('');
  const [defaultSourceName, setDefaultSourceName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, success: 0, failed: 0 });
  const [results, setResults] = useState([]);
  const stopRef = useRef(false);
  const queryClient = useQueryClient();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const urls = parseCSV(text);
      setParsedUrls(urls);
      setResults([]);
      setProgress({ done: 0, total: 0, success: 0, failed: 0 });
      if (urls.length === 0) {
        toast.error('No valid URLs found in CSV. Make sure there is a column with URLs starting with "http".');
      } else {
        toast.success(`Found ${urls.length} URLs in ${file.name}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const processUrl = async (item) => {
    const sourceName = item.sourceName || defaultSourceName.trim() || undefined;
    const response = await base44.functions.invoke('analyzeNewsletterUrl', { url: item.url, sourceName });
    if (response.data.success) {
      return { url: item.url, status: 'success', title: response.data.title || 'Untitled' };
    } else {
      throw new Error(response.data.error || 'Unknown error');
    }
  };

  const startProcessing = async () => {
    if (parsedUrls.length === 0) return;
    stopRef.current = false;
    setStopped(false);
    setProcessing(true);
    setResults([]);
    setProgress({ done: 0, total: parsedUrls.length, success: 0, failed: 0 });

    const allResults = [];
    let done = 0;
    let success = 0;
    let failed = 0;

    // Process in chunks of CONCURRENCY
    for (let i = 0; i < parsedUrls.length; i += CONCURRENCY) {
      if (stopRef.current) break;

      const chunk = parsedUrls.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.allSettled(chunk.map(item => processUrl(item)));

      for (let j = 0; j < chunk.length; j++) {
        const r = chunkResults[j];
        done++;
        if (r.status === 'fulfilled') {
          success++;
          allResults.push(r.value);
        } else {
          failed++;
          allResults.push({ url: chunk[j].url, status: 'error', error: r.reason?.message || 'Failed' });
        }
      }

      setProgress({ done, total: parsedUrls.length, success, failed });
      setResults([...allResults]);
    }

    setProcessing(false);
    if (stopRef.current) {
      setStopped(true);
      toast.info(`Stopped. Processed ${done}/${parsedUrls.length} URLs.`);
    } else {
      toast.success(`Done! ${success} added, ${failed} failed.`);
    }
    queryClient.invalidateQueries({ queryKey: ['newsletters'] });
    queryClient.invalidateQueries({ queryKey: ['adminStats'] });
  };

  const downloadErrors = () => {
    const errors = results.filter(r => r.status === 'error');
    const csv = 'url,error\n' + errors.map(r => `"${r.url}","${r.error}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'failed_urls.csv';
    a.click();
  };

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-violet-600" />
          Bulk CSV Import
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-violet-100 border border-violet-300 rounded-lg p-4 text-sm">
          <p className="font-semibold text-violet-900 mb-1">📊 Import 500+ URLs from CSV</p>
          <p className="text-violet-800 text-xs leading-relaxed">
            Upload a CSV file with a column of newsletter URLs. The system auto-detects the URL column.
            Processes {CONCURRENCY} at a time. Keep this tab open during processing.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Default Source Name (Optional)</Label>
          <Input
            placeholder="e.g., Elion Health, Hospitalogy — used if CSV has no source column"
            value={defaultSourceName}
            onChange={(e) => setDefaultSourceName(e.target.value)}
            disabled={processing}
            className="bg-white"
          />
        </div>

        <div>
          <label htmlFor="csv-upload">
            <Button
              type="button"
              variant="outline"
              className="w-full border-violet-300 hover:bg-violet-50"
              onClick={() => document.getElementById('csv-upload')?.click()}
              disabled={processing}
            >
              <Upload className="w-4 h-4 mr-2" />
              {fileName ? `${fileName} — ${parsedUrls.length} URLs` : 'Choose CSV File'}
            </Button>
          </label>
          <input id="csv-upload" type="file" accept=".csv,.tsv,.txt" onChange={handleFileChange} className="hidden" />
        </div>

        {parsedUrls.length > 0 && !processing && (
          <div className="bg-white border border-violet-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-slate-700">Preview — first 5 URLs:</p>
            <ul className="mt-1 space-y-1">
              {parsedUrls.slice(0, 5).map((item, i) => (
                <li key={i} className="text-xs text-slate-500 truncate">{item.url}</li>
              ))}
              {parsedUrls.length > 5 && (
                <li className="text-xs text-violet-600 font-medium">...and {parsedUrls.length - 5} more</li>
              )}
            </ul>
          </div>
        )}

        {processing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-700">
              <span>Processing {progress.done} / {progress.total}</span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} className="h-3" />
            <div className="flex gap-4 text-xs">
              <span className="text-green-700">✓ {progress.success} added</span>
              <span className="text-red-600">✗ {progress.failed} failed</span>
              <span className="text-slate-500">{progress.total - progress.done} remaining</span>
            </div>
          </div>
        )}

        {!processing && progress.done > 0 && (
          <div className="bg-white border rounded-lg p-3 space-y-1 text-sm">
            <p className="font-semibold text-slate-800">
              {stopped ? '⏹ Stopped' : '✅ Complete'} — {progress.success}/{progress.done} succeeded
            </p>
            <div className="flex gap-4 text-xs">
              <span className="text-green-700">✓ {progress.success} added</span>
              <span className="text-red-600">✗ {progress.failed} failed</span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {parsedUrls.length > 0 && !processing && (
            <Button
              onClick={startProcessing}
              className="bg-violet-600 hover:bg-violet-700 flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              Start Import ({parsedUrls.length} URLs)
            </Button>
          )}

          {processing && (
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => { stopRef.current = true; }}
            >
              <StopCircle className="w-4 h-4 mr-2" />
              Stop
            </Button>
          )}

          {!processing && results.filter(r => r.status === 'error').length > 0 && (
            <Button variant="outline" onClick={downloadErrors} size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download Failed
            </Button>
          )}
        </div>

        {results.length > 0 && (
          <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2 bg-white">
            {results.slice(-20).reverse().map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                {r.status === 'success' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-slate-700 truncate">{r.title}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                    <span className="text-red-700 truncate">{r.url} — {r.error}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}