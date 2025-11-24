import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RoleGuard } from "../components/auth/RoleGuard";
import BackButton from "../components/navigation/BackButton";
import { Calendar, Database, CheckCircle, AlertCircle, Play, Pause, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function PublicationDateMigration() {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [currentBatch, setCurrentBatch] = useState(0);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['migration-stats'],
    queryFn: async () => {
      const response = await base44.functions.invoke('migrateNewsletterDates', {
        action: 'get_stats'
      });
      return response.data.stats;
    }
  });

  const preserveDatesMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('migrateNewsletterDates', {
        action: 'preserve_dates'
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      refetchStats();
    },
    onError: (error) => {
      toast.error('Failed to preserve dates: ' + error.message);
    }
  });

  const extractBatchMutation = useMutation({
    mutationFn: async (startIndex) => {
      const response = await base44.functions.invoke('migrateNewsletterDates', {
        action: 'extract_batch',
        batchSize: 10,
        startIndex
      });
      return response.data;
    }
  });

  const runBatchExtraction = async () => {
    if (!stats) return;
    
    setIsRunning(true);
    setResults([]);
    setProgress(0);
    let currentIndex = 0;

    try {
      while (currentIndex < stats.total) {
        if (!isRunning) break;

        const result = await extractBatchMutation.mutateAsync(currentIndex);
        
        setResults(prev => [...prev, ...result.results]);
        setProgress(result.progress);
        setCurrentBatch(Math.ceil(result.nextIndex / 10));

        if (!result.hasMore) break;
        currentIndex = result.nextIndex;

        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      toast.success('Publication date extraction complete!');
      refetchStats();
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
    } catch (error) {
      toast.error('Extraction failed: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const stopExtraction = () => {
    setIsRunning(false);
  };

  if (statsLoading) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <BackButton className="mb-4" />
        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-600">Loading migration status...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <BackButton className="mb-4" />
        
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Publication Date Migration</h1>
              <p className="text-slate-600 text-lg">Extract actual publication dates from newsletter URLs</p>
            </div>
          </div>
        </div>

        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>Safe Migration Process:</strong> This tool preserves all existing dates and extracts actual 
            publication dates from source URLs. Original "date added" timestamps are never deleted.
          </AlertDescription>
        </Alert>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Newsletters</p>
                  <p className="text-3xl font-bold text-slate-900">{stats?.total || 0}</p>
                </div>
                <Database className="w-8 h-8 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">With Publication Date</p>
                  <p className="text-3xl font-bold text-green-700">{stats?.withPublicationDate || 0}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Needs Extraction</p>
                  <p className="text-3xl font-bold text-orange-700">{stats?.needsExtraction || 0}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-2">Confidence Levels</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>High</span>
                    <Badge variant="outline" className="bg-green-50">{stats?.confidence.high || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Medium</span>
                    <Badge variant="outline" className="bg-yellow-50">{stats?.confidence.medium || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Unknown</span>
                    <Badge variant="outline">{stats?.confidence.unknown || 0}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Migration Steps */}
        <div className="space-y-6">
          {/* Step 1: Preserve Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">1</span>
                Preserve Existing Dates
              </CardTitle>
              <CardDescription>
                Copy existing created_date values to date_added_to_app field (safe, non-destructive)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-2">
                    Status: {stats?.withDateAddedToApp === stats?.total ? (
                      <Badge className="bg-green-100 text-green-800">Complete</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800">Ready to run</Badge>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {stats?.withDateAddedToApp || 0} / {stats?.total || 0} preserved
                  </p>
                </div>
                <Button
                  onClick={() => preserveDatesMutation.mutate()}
                  disabled={preserveDatesMutation.isPending || stats?.withDateAddedToApp === stats?.total}
                  variant="outline"
                >
                  {preserveDatesMutation.isPending ? 'Preserving...' : 'Run Step 1'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Extract Publication Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">2</span>
                Extract Publication Dates from URLs
              </CardTitle>
              <CardDescription>
                Scrape actual publication dates from source articles (batched processing)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {!isRunning ? (
                  <Button
                    onClick={runBatchExtraction}
                    disabled={stats?.withDateAddedToApp !== stats?.total}
                    className="bg-gradient-to-r from-purple-600 to-purple-700"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Extraction
                  </Button>
                ) : (
                  <Button onClick={stopExtraction} variant="destructive">
                    <Pause className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                )}
                <Button onClick={refetchStats} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Stats
                </Button>
              </div>

              {isRunning && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Processing batch {currentBatch}...</span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {results.length > 0 && (
                <div className="mt-4 max-h-96 overflow-y-auto space-y-2">
                  <h4 className="font-semibold text-sm text-slate-900 mb-2">Recent Results:</h4>
                  {results.slice(-10).reverse().map((result, idx) => (
                    <div key={idx} className="text-xs border-l-2 pl-3 py-1" style={{
                      borderColor: result.status === 'success' ? '#22c55e' : 
                                  result.status === 'skipped' ? '#64748b' : '#ef4444'
                    }}>
                      <div className="font-medium text-slate-900 truncate">{result.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {result.status}
                        </Badge>
                        {result.confidence && (
                          <Badge variant="outline" className="text-xs">
                            {result.confidence} confidence
                          </Badge>
                        )}
                        {result.date && (
                          <span className="text-slate-600">{result.date}</span>
                        )}
                      </div>
                      {result.source && (
                        <div className="text-slate-500 mt-1">Source: {result.source}</div>
                      )}
                      {result.error && (
                        <div className="text-red-600 mt-1">{result.error}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Alert className="mt-6 bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-900 text-sm">
            <strong>What happens next:</strong> After extraction completes, the UI will automatically use 
            publication_date for sorting and display. The original date_added_to_app is preserved for reference. 
            All changes are non-destructive and reversible.
          </AlertDescription>
        </Alert>
      </div>
    </RoleGuard>
  );
}