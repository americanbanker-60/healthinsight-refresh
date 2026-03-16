import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, ArrowRight, RefreshCw } from "lucide-react";

export default function DailyIntelligenceBrief() {
  const [bullets, setBullets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBrief = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const recent = await base44.entities.NewsletterItem.list("-created_date", 5);
      if (!recent || recent.length === 0) {
        setBullets([]);
        setIsLoading(false);
        return;
      }

      const context = recent.map(n =>
        `Title: ${n.title}\nTLDR: ${n.tldr || ""}\nKey Takeaways: ${(n.key_takeaways || []).join("; ")}\nThemes: ${(n.themes || []).map(t => t.theme).join(", ")}`
      ).join("\n\n---\n\n");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a senior healthcare investment analyst. Based on the following recent newsletter intelligence, identify exactly 3 critical healthcare market shifts that executives and investors should be aware of today. Be specific, data-driven, and concise (one sentence each). Focus on M&A implications, market disruption, or policy/regulatory impact.\n\nNewsletter Intelligence:\n${context}`,
        response_json_schema: {
          type: "object",
          properties: {
            shifts: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setBullets(result?.shifts?.slice(0, 3) || []);
    } catch (err) {
      setError("Unable to generate brief.");
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchBrief(); }, []);

  return (
    <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50/60 to-slate-50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-lg text-slate-900">Daily Intelligence Brief</CardTitle>
            <span className="text-xs text-slate-500 font-normal ml-1">Critical Healthcare Shifts</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchBrief}
              disabled={isLoading}
              className="h-7 w-7 text-slate-400 hover:text-slate-600"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Link to={createPageUrl("DeepDiveResults")}>
              <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100 h-7 text-xs gap-1">
                Deep Dive
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : error ? (
          <p className="text-sm text-slate-400 italic">{error}</p>
        ) : bullets.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Analyze newsletters to generate your daily brief.</p>
        ) : (
          <ul className="space-y-2">
            {bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                {bullet}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}