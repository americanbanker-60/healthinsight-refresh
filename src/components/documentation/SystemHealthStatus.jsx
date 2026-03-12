import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Clock,
  Database,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Active integrations used in the app
const ACTIVE_INTEGRATIONS = [
  {
    name: "InvokeLLM",
    description: "AI-powered newsletter analysis, summaries, trend discovery, PE briefs",
    uses: ["analyzeNewsletterUrl", "analyzeNewsletterPDF", "autoGenerateTopics", "dailyIntelligenceBrief"],
  },
  {
    name: "UploadFile",
    description: "Uploads PDF files for newsletter ingestion",
    uses: ["analyzeNewsletterPDF"],
  },
  {
    name: "ExtractDataFromUploadedFile",
    description: "Extracts structured data from uploaded PDFs",
    uses: ["analyzeNewsletterPDF"],
  },
  {
    name: "SendEmail",
    description: "Email delivery for notifications (configured, not active)",
    uses: [],
    inactive: true,
  },
];

function HealthBadge({ status }) {
  if (status === "healthy")
    return (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Healthy
      </Badge>
    );
  if (status === "stale")
    return (
      <Badge className="bg-amber-100 text-amber-800">
        <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Stale
      </Badge>
    );
  return (
    <Badge className="bg-red-100 text-red-800">
      <XCircle className="w-3.5 h-3.5 mr-1.5" /> No Recent Activity
    </Badge>
  );
}

export default function SystemHealthStatus() {
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [scrapeStatus, setScrapeStatus] = useState(null);
  const [analyzeStatus, setAnalyzeStatus] = useState(null);

  const checkHealth = async () => {
    setLoading(true);
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Check scrapeSource: look for completed ScrapeJob in last 24h
    const recentScrapes = await base44.entities.ScrapeJob.filter(
      { status: "completed" },
      "-completed_at",
      5
    );

    const latestScrape = recentScrapes?.[0];
    const scrapeRecent = latestScrape?.completed_at && latestScrape.completed_at >= cutoff24h;

    setScrapeStatus({
      health: scrapeRecent ? "healthy" : latestScrape ? "stale" : "dead",
      lastRun: latestScrape?.completed_at || null,
      details: latestScrape
        ? `${latestScrape.newsletters_created ?? 0} new newsletters from "${latestScrape.source_name}"`
        : "No completed scrape jobs found",
    });

    // Check analyzeNewsletterUrl: look for recently analyzed newsletters
    const recentAnalyzed = await base44.entities.NewsletterItem.filter(
      { is_analyzed: true },
      "-updated_date",
      5
    );

    const latestAnalyzed = recentAnalyzed?.[0];
    const analyzeRecent =
      latestAnalyzed?.updated_date && latestAnalyzed.updated_date >= cutoff24h;

    setAnalyzeStatus({
      health: analyzeRecent ? "healthy" : latestAnalyzed ? "stale" : "dead",
      lastRun: latestAnalyzed?.updated_date || null,
      details: latestAnalyzed
        ? `Last analyzed: "${latestAnalyzed.title?.slice(0, 60)}..."`
        : "No analyzed newsletters found",
    });

    setLastChecked(new Date());
    setLoading(false);
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const functions = [
    {
      name: "scrapeSource",
      label: "Content Ingestion (scrapeSource)",
      description: "Scrapes newsletters from registered sources",
      data: scrapeStatus,
    },
    {
      name: "analyzeNewsletterUrl",
      label: "AI Analysis (analyzeNewsletterUrl)",
      description: "Processes and analyzes newsletter content with AI",
      data: analyzeStatus,
    },
  ];

  const overallHealthy =
    !loading &&
    scrapeStatus?.health === "healthy" &&
    analyzeStatus?.health === "healthy";
  const overallDegraded =
    !loading &&
    (scrapeStatus?.health === "stale" || analyzeStatus?.health === "stale");

  return (
    <div className="space-y-6">
      {/* Overall Status Banner */}
      <Card
        className={
          loading
            ? "bg-slate-50 border-slate-200"
            : overallHealthy
            ? "bg-green-50 border-green-200"
            : overallDegraded
            ? "bg-amber-50 border-amber-200"
            : "bg-red-50 border-red-200"
        }
      >
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity
                className={`w-5 h-5 ${
                  loading
                    ? "text-slate-400"
                    : overallHealthy
                    ? "text-green-600"
                    : overallDegraded
                    ? "text-amber-600"
                    : "text-red-600"
                }`}
              />
              <div>
                <p className="font-semibold text-slate-900">
                  {loading
                    ? "Checking system health..."
                    : overallHealthy
                    ? "All systems operational — data is fresh"
                    : overallDegraded
                    ? "Intelligence data may be stale (>24 hours)"
                    : "Critical: No recent function activity detected"}
                </p>
                {lastChecked && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Last checked {formatDistanceToNow(lastChecked, { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkHealth}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Function Health Cards */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          Backend Function Health (Last 24 Hours)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {functions.map((fn) => (
            <Card key={fn.name} className="border-slate-200">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold text-slate-800">
                    {fn.label}
                  </CardTitle>
                  {loading ? (
                    <Badge className="bg-slate-100 text-slate-500">
                      <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> Checking
                    </Badge>
                  ) : (
                    <HealthBadge status={fn.data?.health} />
                  )}
                </div>
                <p className="text-xs text-slate-500 font-normal">{fn.description}</p>
              </CardHeader>
              <CardContent className="pb-4">
                {!loading && fn.data && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>
                        {fn.data.lastRun
                          ? `Last run: ${formatDistanceToNow(new Date(fn.data.lastRun), { addSuffix: true })}`
                          : "Never run"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 pl-5">{fn.data.details}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Active Integrations */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-600" />
          Active Platform Integrations
        </h3>
        <Card>
          <CardContent className="pt-5">
            <div className="space-y-4">
              {ACTIVE_INTEGRATIONS.map((integration) => (
                <div
                  key={integration.name}
                  className="flex items-start justify-between gap-4 pb-4 border-b last:border-0 last:pb-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-slate-800">
                        Core.{integration.name}
                      </span>
                      {integration.inactive ? (
                        <Badge className="bg-slate-100 text-slate-500 text-xs">Inactive</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-1.5">{integration.description}</p>
                    {integration.uses.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {integration.uses.map((fn) => (
                          <span
                            key={fn}
                            className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono"
                          >
                            {fn}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}