import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function SourceDiagnostic() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      // Fetch directly from API, bypassing cache
      const allSourcesDirect = await base44.entities.Source.list("name");
      
      // Get user info
      const user = await base44.auth.me();
      
      // Count by status
      const active = allSourcesDirect.filter(s => !s.is_deleted);
      const deleted = allSourcesDirect.filter(s => s.is_deleted);
      const noFlag = allSourcesDirect.filter(s => s.is_deleted === undefined || s.is_deleted === null);
      
      setResult({
        total: allSourcesDirect.length,
        active: active.length,
        deleted: deleted.length,
        noFlag: noFlag.length,
        user: user.email,
        userRole: user.role,
        rawSources: allSourcesDirect.slice(0, 5), // First 5 for inspection
      });
      
      toast.success("Diagnostic complete - check results below");
    } catch (error) {
      toast.error(`Diagnostic failed: ${error.message}`);
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <Card className="mb-6 bg-yellow-50 border-yellow-300">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🔍 Source Database Diagnostic</span>
          <Button onClick={runDiagnostic} disabled={loading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Run Diagnostic
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!result ? (
          <p className="text-sm text-slate-600">Click "Run Diagnostic" to check database state</p>
        ) : result.error ? (
          <div className="text-red-700 text-sm">
            <XCircle className="w-4 h-4 inline mr-2" />
            Error: {result.error}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded border">
                <p className="text-xs text-slate-500">Total in DB</p>
                <p className="text-2xl font-bold">{result.total}</p>
              </div>
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-xs text-green-700">Active (is_deleted=false)</p>
                <p className="text-2xl font-bold text-green-700">{result.active}</p>
              </div>
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <p className="text-xs text-red-700">Deleted (is_deleted=true)</p>
                <p className="text-2xl font-bold text-red-700">{result.deleted}</p>
              </div>
              <div className="bg-amber-50 p-3 rounded border border-amber-200">
                <p className="text-xs text-amber-700">No Flag Set</p>
                <p className="text-2xl font-bold text-amber-700">{result.noFlag}</p>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 mb-1">User Context</p>
              <p className="text-sm text-blue-800">Email: {result.user}</p>
              <p className="text-sm text-blue-800">Role: {result.userRole}</p>
            </div>

            {result.noFlag > 0 && (
              <div className="bg-red-50 p-3 rounded border border-red-300">
                <p className="text-sm font-semibold text-red-900 mb-1">
                  ⚠️ PROBLEM FOUND: {result.noFlag} sources have no is_deleted flag!
                </p>
                <p className="text-xs text-red-800">
                  These sources were created without the is_deleted field and won't show up in the active list.
                </p>
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded border text-xs font-mono">
              <p className="font-semibold mb-2">Sample Sources (first 5):</p>
              {result.rawSources.map((s, idx) => (
                <div key={idx} className="mb-2 p-2 bg-white rounded border">
                  <div><strong>Name:</strong> {s.name}</div>
                  <div><strong>ID:</strong> {s.id}</div>
                  <div><strong>is_deleted:</strong> {String(s.is_deleted)} (type: {typeof s.is_deleted})</div>
                  <div><strong>Category:</strong> {s.category}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}