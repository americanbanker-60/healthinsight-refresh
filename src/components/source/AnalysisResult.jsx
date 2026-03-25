import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, Download, Mail, ExternalLink, ArrowLeft,
  TrendingUp, Lightbulb, Briefcase, DollarSign, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

function EmailDialog({ open, onOpenChange, analysis }) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const send = async () => {
    if (!recipientEmail.trim()) { toast.error("Please enter a recipient email"); return; }
    setIsSending(true);
    try {
      const lines = [
        `<h2>${analysis.title || "Healthcare Intelligence Analysis"}</h2>`,
        analysis.tldr ? `<h3>TL;DR</h3><p>${analysis.tldr}</p>` : "",
        analysis.key_takeaways?.length
          ? `<h3>Key Takeaways</h3><ul>${analysis.key_takeaways.map(t => `<li>${t}</li>`).join("")}</ul>`
          : "",
        analysis.recommended_actions?.length
          ? `<h3>Recommended Actions</h3><ol>${analysis.recommended_actions.map(a => `<li>${a}</li>`).join("")}</ol>`
          : "",
        analysis.source_url ? `<p><a href="${analysis.source_url}">View Original Source</a></p>` : "",
      ].filter(Boolean);
      await base44.integrations.Core.SendEmail({
        to: recipientEmail.trim(),
        subject: `Healthcare Intelligence: ${analysis.title || "Analysis"}`,
        body: lines.join("\n"),
      });
      toast.success(`Sent to ${recipientEmail}`);
      setRecipientEmail("");
      onOpenChange(false);
    } catch (err) {
      toast.error(`Email failed: ${err?.message || "Unknown error"}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Analysis via Email</DialogTitle>
          <DialogDescription>Enter a recipient email to share this healthcare intelligence report.</DialogDescription>
        </DialogHeader>
        <Input type="email" placeholder="recipient@example.com" value={recipientEmail}
          onChange={e => setRecipientEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} className="my-2" />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={isSending} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Mail className="w-4 h-4 mr-2" />Send</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AnalysisResult({ analysis, onReset }) {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const exportPDF = async () => {
    setIsExportingPDF(true);
    try {
      const response = await base44.functions.invoke('exportNewsletterPDF', {
        newsletterId: analysis.id,
        newsletterData: analysis
      });
      const { pdfBase64, filename } = response.data;
      const base64Data = pdfBase64.split(',')[1];
      const byteNumbers = new Uint8Array(atob(base64Data).split('').map(c => c.charCodeAt(0)));
      const blob = new Blob([byteNumbers], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = filename;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('PDF export failed: ' + err.message);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const sentimentColors = {
    positive: "bg-green-100 text-green-800 border-green-200",
    neutral: "bg-slate-100 text-slate-800 border-slate-200",
    negative: "bg-red-100 text-red-800 border-red-200",
    mixed: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold text-sm">Saved to your library</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{analysis.title}</h2>
          {analysis.sentiment && (
            <Badge className={`mt-2 border ${sentimentColors[analysis.sentiment]}`}>{analysis.sentiment} sentiment</Badge>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={isExportingPDF}>
            {isExportingPDF ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Exporting...</> : <><Download className="w-4 h-4 mr-1" />Export PDF</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowEmailDialog(true)} className="bg-blue-50 border-blue-200 hover:bg-blue-100">
            <Mail className="w-4 h-4 mr-1" />Email
          </Button>
          {analysis.id && (
            <Button
              variant="outline"
              size="sm"
              className="bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-700"
              onClick={() => {
                sessionStorage.setItem(`newsletter_cache_${analysis.id}`, JSON.stringify(analysis));
                window.open(`${createPageUrl("NewsletterDetail")}?id=${analysis.id}`, "_blank");
              }}
            >
              <ExternalLink className="w-4 h-4 mr-1" />Full Detail
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onReset}><ArrowLeft className="w-4 h-4 mr-1" />New</Button>
        </div>
      </div>

      {analysis.tldr && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-bold text-slate-900 mb-2 text-xs uppercase tracking-wide">TL;DR</h3>
          <p className="text-slate-800 font-medium leading-relaxed">{analysis.tldr}</p>
        </div>
      )}

      {analysis.key_statistics?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />Key Statistics
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {analysis.key_statistics.map((stat, i) => (
              <div key={i} className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                <div className="text-xl font-bold text-indigo-900">{stat.figure}</div>
                <p className="text-sm text-slate-600 mt-1">{stat.context}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {analysis.key_takeaways?.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />Key Takeaways
            </h3>
            <ul className="space-y-2">
              {analysis.key_takeaways.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="text-blue-500 font-bold mt-0.5">•</span>{t}
                </li>
              ))}
            </ul>
          </div>
        )}
        {analysis.themes?.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-purple-600" />Major Themes
            </h3>
            <div className="space-y-3">
              {analysis.themes.map((theme, i) => (
                <div key={i} className="border-l-4 border-purple-400 pl-3">
                  <p className="font-medium text-slate-800 text-sm">{theme.theme}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{theme.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {analysis.ma_activities?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-green-600" />M&A Activity
          </h3>
          <div className="space-y-3">
            {analysis.ma_activities.map((deal, i) => (
              <div key={i} className="bg-green-50 rounded-lg p-4 border border-green-100">
                <p className="font-semibold text-slate-900">{deal.acquirer} → {deal.target}</p>
                {deal.deal_value && <p className="text-green-700 text-sm font-medium">{deal.deal_value}</p>}
                <p className="text-slate-600 text-sm mt-1">{deal.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.funding_rounds?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />Funding Activity
          </h3>
          <div className="space-y-3">
            {analysis.funding_rounds.map((f, i) => (
              <div key={i} className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-slate-900">{f.company}</p>
                  <div className="flex gap-2">
                    {f.amount && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">{f.amount}</Badge>}
                    {f.round_type && <Badge variant="outline" className="text-xs">{f.round_type}</Badge>}
                  </div>
                </div>
                <p className="text-slate-600 text-sm mt-1">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <EmailDialog open={showEmailDialog} onOpenChange={setShowEmailDialog} analysis={analysis} />
    </div>
  );
}