import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, TrendingUp, Lightbulb, Briefcase, DollarSign } from "lucide-react";

const sentimentColors = {
  positive: "bg-green-100 text-green-800 border-green-200",
  neutral: "bg-slate-100 text-slate-800 border-slate-200",
  negative: "bg-red-100 text-red-800 border-red-200",
  mixed: "bg-yellow-100 text-yellow-800 border-yellow-200"
};

export default function AnalysisPreview({ analysis, onSave }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-slate-200/60">
        <CardHeader className="border-b border-slate-200/60">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">{analysis.title}</CardTitle>
              {analysis.sentiment && (
                <Badge className={`${sentimentColors[analysis.sentiment]} border font-medium`}>
                  {analysis.sentiment} sentiment
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {analysis.summary && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-slate-900 mb-2">Executive Summary</h3>
              <p className="text-slate-700 leading-relaxed">{analysis.summary}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {analysis.key_takeaways && analysis.key_takeaways.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
            <CardHeader className="border-b border-slate-200/60">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Key Takeaways
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {analysis.key_takeaways.map((takeaway, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="text-blue-600 font-bold mt-1">•</span>
                    <span className="text-slate-700">{takeaway}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {analysis.themes && analysis.themes.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
            <CardHeader className="border-b border-slate-200/60">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-purple-600" />
                Major Themes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {analysis.themes.map((theme, index) => (
                  <div key={index} className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-semibold text-slate-900 mb-1">{theme.theme}</h4>
                    <p className="text-sm text-slate-600">{theme.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {analysis.ma_activities && analysis.ma_activities.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
          <CardHeader className="border-b border-slate-200/60">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-green-600" />
              M&A Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {analysis.ma_activities.map((deal, index) => (
                <div key={index} className="bg-green-50 rounded-xl p-5 border border-green-100">
                  <p className="font-semibold text-slate-900 mb-1">
                    {deal.acquirer} → {deal.target}
                  </p>
                  {deal.deal_value && (
                    <p className="text-green-700 font-medium mb-2">{deal.deal_value}</p>
                  )}
                  <p className="text-slate-700 text-sm">{deal.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {analysis.funding_rounds && analysis.funding_rounds.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
          <CardHeader className="border-b border-slate-200/60">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Funding Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {analysis.funding_rounds.map((funding, index) => (
                <div key={index} className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-slate-900">{funding.company}</p>
                    <div className="flex gap-2">
                      {funding.amount && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                          {funding.amount}
                        </Badge>
                      )}
                      {funding.round_type && (
                        <Badge variant="outline">{funding.round_type}</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-700 text-sm">{funding.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button
          onClick={onSave}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg shadow-green-500/30"
        >
          <Save className="w-4 h-4 mr-2" />
          Save to Library
        </Button>
      </div>
    </motion.div>
  );
}