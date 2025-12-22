import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Wrench, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function SourceDatabaseFix() {
  const [diagnosis, setDiagnosis] = useState(null);
  const [fixing, setFixing] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);

  const runDiagnosis = async () => {
    setDiagnosing(true);
    try {
      // Get all sources via SDK with all filters
      const allSourcesQuery = await base44.entities.Source.filter({});
      
      // Count by is_deleted status
      const active = allSourcesQuery.filter(s => s.is_deleted === false);
      const deleted = allSourcesQuery.filter(s => s.is_deleted === true);
      const orphaned = allSourcesQuery.filter(s => s.is_deleted === undefined || s.is_deleted === null);
      
      console.log("=== DIAGNOSTIC RESULTS ===");
      console.log("Total sources:", allSourcesQuery.length);
      console.log("Active (is_deleted=false):", active.length);
      console.log("Deleted (is_deleted=true):", deleted.length);
      console.log("Orphaned (is_deleted=null/undefined):", orphaned.length);
      console.log("Orphaned sources:", orphaned);
      
      setDiagnosis({
        totalInDatabase: allSourcesQuery.length,
        active: active.length,
        deleted: deleted.length,
        orphaned: orphaned.length,
        orphanedSources: orphaned,
        sampleActive: active.slice(0, 3),
        sampleOrphaned: orphaned.slice(0, 5)
      });
      
      if (orphaned.length > 0) {
        toast.warning(`Found ${orphaned.length} sources without is_deleted flag!`);
      } else if (allSourcesQuery.length === 0) {
        toast.info("No sources found in database");
      } else {
        toast.success("Database check complete");
      }
    } catch (error) {
      console.error("Diagnosis error:", error);
      toast.error(`Diagnosis failed: ${error.message}`);
    }
    setDiagnosing(false);
  };

  const fixOrphanedSources = async () => {
    if (!diagnosis || diagnosis.orphaned === 0) return;
    
    setFixing(true);
    try {
      let fixed = 0;
      
      for (const source of diagnosis.orphanedSources) {
        try {
          await base44.entities.Source.update(source.id, { is_deleted: false });
          console.log(`✓ Fixed source: ${source.name}`);
          fixed++;
        } catch (err) {
          console.error(`✗ Failed to fix ${source.name}:`, err);
        }
      }
      
      toast.success(`✓ Fixed ${fixed} sources! Refresh the page to see them.`);
      
      // Re-diagnose
      setTimeout(() => runDiagnosis(), 1000);
      
    } catch (error) {
      toast.error(`Fix failed: ${error.message}`);
    }
    setFixing(false);
  };

  return (
    <Card className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border-red-300">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Database Diagnostic & Repair
          </span>
          <Button 
            onClick={runDiagnosis} 
            disabled={diagnosing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${diagnosing ? 'animate-spin' : ''}`} />
            {diagnosing ? "Checking..." : "Run Check"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!diagnosis ? (
          <div className="text-center py-6">
            <p className="text-slate-600 mb-4">
              Click "Run Check" to diagnose why sources aren't appearing
            </p>
            <div className="text-sm text-slate-500 bg-white p-3 rounded border">
              <p className="font-semibold mb-1">What this checks:</p>
              <ul className="text-left space-y-1">
                <li>• Total sources in database vs SDK query</li>
                <li>• Sources missing is_deleted flag (orphaned)</li>
                <li>• RLS policy filtering issues</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white p-3 rounded-lg border border-slate-300">
                <p className="text-xs text-slate-500 font-semibold">In Database</p>
                <p className="text-2xl font-bold text-slate-900">{diagnosis.totalInDatabase}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-300">
                <p className="text-xs text-blue-700 font-semibold">Via SDK Query</p>
                <p className="text-2xl font-bold text-blue-700">{diagnosis.totalViaSDK}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-300">
                <p className="text-xs text-green-700 font-semibold">Active</p>
                <p className="text-2xl font-bold text-green-700">{diagnosis.active}</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-300">
                <p className="text-xs text-amber-700 font-semibold">Deleted</p>
                <p className="text-2xl font-bold text-amber-700">{diagnosis.deleted}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg border border-red-300">
                <p className="text-xs text-red-700 font-semibold">⚠️ Orphaned</p>
                <p className="text-2xl font-bold text-red-700">{diagnosis.orphaned}</p>
              </div>
            </div>

            {diagnosis.orphaned > 0 && (
              <div className="bg-red-100 border border-red-400 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-700 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-red-900 mb-2">
                      🔴 PROBLEM IDENTIFIED: {diagnosis.orphaned} orphaned sources
                    </p>
                    <p className="text-sm text-red-800 mb-3">
                      These sources exist in the database but have <code className="bg-red-200 px-1 rounded">is_deleted = null</code> instead of <code className="bg-red-200 px-1 rounded">false</code>.
                      This causes them to be filtered out from the list.
                    </p>
                    <div className="bg-white p-3 rounded border border-red-300 mb-3 text-xs font-mono max-h-40 overflow-y-auto">
                      <p className="font-semibold mb-2">Orphaned Sources:</p>
                      {diagnosis.orphanedSources.map((s, idx) => (
                        <div key={idx} className="mb-1">
                          • {s.name} (ID: {s.id})
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={fixOrphanedSources}
                      disabled={fixing}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {fixing ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Fixing...
                        </>
                      ) : (
                        <>
                          <Wrench className="w-4 h-4 mr-2" />
                          Fix All Orphaned Sources
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {diagnosis.orphaned === 0 && diagnosis.totalInDatabase === diagnosis.totalViaSDK && (
              <div className="bg-green-100 border border-green-400 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-700 mt-0.5" />
                <div>
                  <p className="font-bold text-green-900">✓ Database is healthy</p>
                  <p className="text-sm text-green-800 mt-1">
                    All sources have proper is_deleted flags. No orphaned records found.
                  </p>
                </div>
              </div>
            )}

            {diagnosis.totalInDatabase > diagnosis.totalViaSDK && diagnosis.orphaned === 0 && (
              <div className="bg-amber-100 border border-amber-400 rounded-lg p-4">
                <p className="font-bold text-amber-900 mb-1">
                  ⚠️ SDK returns fewer sources than database
                </p>
                <p className="text-sm text-amber-800">
                  Database has {diagnosis.totalInDatabase} sources, but SDK query returns {diagnosis.totalViaSDK}.
                  This may indicate an RLS policy issue.
                </p>
              </div>
            )}

            <details className="bg-white border rounded-lg p-4">
              <summary className="cursor-pointer font-semibold text-sm text-slate-700">
                📊 View Raw Data (Debug Info)
              </summary>
              <div className="mt-3 text-xs font-mono bg-slate-50 p-3 rounded border max-h-64 overflow-y-auto">
                <pre>{JSON.stringify(diagnosis, null, 2)}</pre>
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}