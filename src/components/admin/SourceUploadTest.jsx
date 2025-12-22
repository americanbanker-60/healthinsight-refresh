import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

export default function SourceUploadTest() {
  const [testUrl, setTestUrl] = useState("https://example.com");
  const [status, setStatus] = useState({ type: "", message: "", details: null });
  const [loading, setLoading] = useState(false);

  const testSingleUpload = async () => {
    setLoading(true);
    setStatus({ type: "", message: "", details: null });

    try {
      // Step 1: Check auth
      const user = await base44.auth.me();
      console.log("✓ User authenticated:", user.email, user.role);
      
      if (user.role !== 'admin') {
        setStatus({ type: "error", message: "Not an admin user", details: { role: user.role } });
        setLoading(false);
        return;
      }

      // Step 2: Parse URL
      const urlObj = new URL(testUrl);
      const hostname = urlObj.hostname.replace('www.', '');
      const baseName = hostname.split('.')[0];
      const sourceName = baseName.charAt(0).toUpperCase() + baseName.slice(1);

      const sourceData = {
        name: sourceName,
        url: testUrl,
        category: "General",
        description: "Test source",
        is_deleted: false
      };

      console.log("✓ Source data prepared:", sourceData);

      // Step 3: Attempt create
      const result = await base44.entities.Source.create(sourceData);
      
      console.log("✓ Source created successfully:", result);
      setStatus({ 
        type: "success", 
        message: `Source created: ${result.name}`, 
        details: { id: result.id, created: result.created_date }
      });

    } catch (error) {
      console.error("✗ Upload failed:", error);
      setStatus({ 
        type: "error", 
        message: error.message || "Unknown error", 
        details: {
          stack: error.stack,
          response: error.response?.data,
          status: error.response?.status
        }
      });
    }

    setLoading(false);
  };

  return (
    <Card className="bg-yellow-50 border-yellow-200">
      <CardHeader>
        <CardTitle>🔧 Source Upload Diagnostic Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Test URL:</label>
          <Input
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </div>

        <Button 
          onClick={testSingleUpload} 
          disabled={loading}
          className="w-full bg-yellow-600 hover:bg-yellow-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            "Test Single Upload"
          )}
        </Button>

        {status.type && (
          <div className={`p-4 rounded-lg ${
            status.type === 'success' ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
          }`}>
            <div className="flex items-start gap-2">
              {status.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-semibold ${
                  status.type === 'success' ? 'text-green-900' : 'text-red-900'
                }`}>
                  {status.message}
                </p>
                {status.details && (
                  <pre className="mt-2 text-xs overflow-auto max-h-64 bg-white p-2 rounded">
                    {JSON.stringify(status.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <p className="font-semibold mb-1">Instructions:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Enter a test URL above</li>
            <li>Click "Test Single Upload"</li>
            <li>Check the result and console logs</li>
            <li>If it fails, copy the error details and share them</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}