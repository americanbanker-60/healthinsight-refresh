// DEPRECATED: safe to remove — not imported anywhere in the app
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

export default function SourceUploadManager() {
  const [showUrlPaste, setShowUrlPaste] = useState(false);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [urlText, setUrlText] = useState("");
  const [urlPreview, setUrlPreview] = useState([]);
  const [isProcessingUrls, setIsProcessingUrls] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const queryClient = useQueryClient();

  const handleUrlPaste = (text) => {
    setUrlText(text);
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const preview = lines.slice(0, 10).map(url => {
      try {
        const urlObj = new URL(url);
        return { url, valid: true, name: urlObj.hostname.replace('www.', '') };
      } catch {
        return { url, valid: false, name: 'Invalid URL' };
      }
    });
    setUrlPreview(preview);
  };

  const processUrlPaste = async () => {
    if (!urlText.trim()) return;
    setIsProcessingUrls(true);
    
    try {
      const lines = urlText.split('\n').map(line => line.trim()).filter(line => line);
      const validUrls = lines
        .filter(line => {
          try { new URL(line); return true; } catch { return false; }
        })
        .map(line => {
          const hostname = new URL(line).hostname.replace('www.', '');
          const baseName = hostname.split('.')[0];
          return {
            name: baseName.charAt(0).toUpperCase() + baseName.slice(1),
            url: line,
            category: "General",
            description: "",
            is_deleted: false
          };
        });

      if (validUrls.length === 0) {
        toast.error("No valid URLs found");
        setIsProcessingUrls(false);
        return;
      }

      let successCount = 0;
      for (const source of validUrls) {
        try {
          await base44.entities.Source.create(source);
          successCount++;
        } catch (err) {
          console.error(`Failed to create ${source.name}:`, err);
        }
      }
      
      await queryClient.invalidateQueries({ queryKey: ['sources'] });
      
      if (successCount > 0) {
        toast.success(`Created ${successCount}/${validUrls.length} sources. Go to Admin Dashboard → Source Scraper to fetch newsletters.`);
      }
      
      setShowUrlPaste(false);
      setUrlText("");
      setUrlPreview([]);
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
    }
    setIsProcessingUrls(false);
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') return;

        const rows = text.split('\n')
          .map(row => row.split(',').map(cell => cell.trim()))
          .filter(row => row.some(cell => cell));
        
        if (rows.length < 2) {
          toast.error("CSV file is empty or has no data rows");
          return;
        }

        const headers = rows[0];
        const sourceColIndex = headers.findIndex(h => h.toLowerCase() === 'source');
        const urlColIndex = headers.findIndex(h => h.toLowerCase() === 'url');

        if (sourceColIndex === -1 || urlColIndex === -1) {
          toast.error("CSV must have 'Source' and 'URL' columns");
          return;
        }

        const preview = rows.slice(1, 6).map(row => ({
          name: row[sourceColIndex] || '',
          url: row[urlColIndex] || ''
        })).filter(item => item.name && item.url);

        if (preview.length === 0) {
          toast.error("No valid rows found in CSV");
          return;
        }

        setCsvFile(text);
        setCsvPreview(preview);
        toast.success(`Loaded ${preview.length}+ rows from CSV`);
      } catch (err) {
        toast.error(`Failed to parse CSV: ${err.message}`);
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read file");
    };

    reader.readAsText(file);
  };

  const processCsvUpload = async () => {
    if (!csvFile) return;
    setIsProcessingCsv(true);
    
    try {
      const rows = csvFile.split('\n')
        .map(row => row.split(',').map(cell => cell.trim()))
        .filter(row => row.some(cell => cell));
      
      const headers = rows[0];
      const sourceColIndex = headers.findIndex(h => h.toLowerCase() === 'source');
      const urlColIndex = headers.findIndex(h => h.toLowerCase() === 'url');

      const sourcesToCreate = rows.slice(1)
        .map(row => ({
          name: row[sourceColIndex],
          url: row[urlColIndex],
          category: "General",
          description: "",
          is_deleted: false
        }))
        .filter(item => item.name && item.url);

      let successCount = 0;
      for (const source of sourcesToCreate) {
        try {
          await base44.entities.Source.create(source);
          successCount++;
        } catch (err) {
          console.error(`Failed to create ${source.name}:`, err);
        }
      }
      
      await queryClient.invalidateQueries({ queryKey: ['sources'] });
      
      if (successCount > 0) {
        toast.success(`Created ${successCount} sources. Go to Admin Dashboard → Source Scraper to fetch newsletters.`);
      }
      
      setShowCsvUpload(false);
      setCsvFile(null);
      setCsvPreview([]);
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
    }
    setIsProcessingCsv(false);
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowUrlPaste(true)} className="bg-green-600 hover:bg-green-700">
          <Upload className="w-4 h-4 mr-2" />
          Paste URLs
        </Button>
        <Button onClick={() => setShowCsvUpload(true)} variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          CSV Upload
        </Button>
      </div>

      {showUrlPaste && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle>Paste URLs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-900 border border-blue-200">
              <p className="font-semibold mb-1">Two-Step Process:</p>
              <p className="text-xs">
                1. This creates source records in the database<br/>
                2. Go to Admin Dashboard → Source Scraper to fetch newsletters
              </p>
            </div>
            
            <Textarea
              placeholder="https://example.com/newsletter&#10;https://another-site.com/blog"
              value={urlText}
              onChange={(e) => handleUrlPaste(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />

            {urlPreview.length > 0 && (
              <div className="border rounded-lg p-3 bg-white">
                <p className="text-sm font-semibold mb-2">Preview (first 10):</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {urlPreview.map((item, idx) => (
                    <div key={idx} className="text-xs flex gap-2 items-center">
                      {item.valid ? (
                        <>
                          <span className="text-green-600">✓</span>
                          <span className="font-medium">{item.name}</span>
                          <span className="text-slate-500">→</span>
                          <span className="text-blue-600 truncate flex-1">{item.url}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-red-600">✗</span>
                          <span className="text-red-600">{item.url}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={processUrlPaste} 
                disabled={!urlText.trim() || isProcessingUrls}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessingUrls ? "Processing..." : "Create Sources"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowUrlPaste(false);
                  setUrlText("");
                  setUrlPreview([]);
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showCsvUpload && (
        <Card className="bg-purple-50 border-purple-200">
          <CardHeader>
            <CardTitle>Bulk Upload from CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-900 border border-blue-200">
              <p className="font-semibold mb-1">Two-Step Process:</p>
              <p className="text-xs">
                1. This uploads source records to the database<br/>
                2. Go to Admin Dashboard → Source Scraper to fetch newsletters
              </p>
            </div>

            <div className="bg-amber-50 p-3 rounded-lg text-sm border border-amber-200">
              <p className="font-semibold text-amber-900 mb-2">Required CSV Columns:</p>
              <div className="space-y-1 text-xs text-amber-800">
                <p><span className="font-mono bg-white px-2 py-1 rounded">Source</span> - Name of the newsletter/source</p>
                <p><span className="font-mono bg-white px-2 py-1 rounded">URL</span> - Website or newsletter URL</p>
              </div>
              <p className="text-xs text-amber-700 mt-2 italic">Example: First row should have column headers, data starts from second row</p>
            </div>
            
            <Input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="cursor-pointer"
            />

            {csvPreview.length > 0 && (
              <div className="border rounded-lg p-3 bg-white">
                <p className="text-sm font-semibold mb-2">Preview (first 5 rows):</p>
                <div className="space-y-1">
                  {csvPreview.map((item, idx) => (
                    <div key={idx} className="text-xs flex gap-2">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-blue-600 truncate">{item.url}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={processCsvUpload} 
                disabled={!csvFile || isProcessingCsv}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isProcessingCsv ? "Processing..." : "Import Sources"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCsvUpload(false);
                  setCsvFile(null);
                  setCsvPreview([]);
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}