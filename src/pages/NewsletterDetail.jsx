import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
        ArrowLeft, 
        ExternalLink, 
        Calendar, 
        TrendingUp, 
        Lightbulb,
        Briefcase,
        DollarSign,
        Building2,
        BarChart3,
        CheckSquare,
        Mail,
        Download,
        Loader2
      } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import EnhanceSummaryButton from "../components/newsletter/EnhanceSummaryButton";
import SummaryParagraphs from "../components/newsletter/SummaryParagraphs";
import EditableNewsletterSection from "../components/newsletter/EditableNewsletterSection";
import BDActionPrompt, { BDInsightBadge } from "../components/bd/BDActionPrompt";

export default function NewsletterDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const newsletterId = urlParams.get('id');
  const [showEmailDialog, setShowEmailDialog] = React.useState(false);
  const [recipientEmail, setRecipientEmail] = React.useState("");
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const [isExportingPDF, setIsExportingPDF] = React.useState(false);

  const exportPDF = async () => {
    setIsExportingPDF(true);
    try {
      const response = await base44.functions.invoke('exportNewsletterPDF', {
        newsletterId: newsletter.id,
        newsletterData: newsletter
      });
      const { pdfBase64, filename } = response?.data ?? response;
      // Strip the data URI prefix to get raw base64
      const base64Data = pdfBase64.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('PDF export failed: ' + err.message);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const { data: newsletter, isLoading, isError, refetch } = useQuery({
    queryKey: ['newsletter', newsletterId],
    queryFn: async () => {
      // Fast path: use analysis data cached by AnalysisResult just before navigation
      const cached = sessionStorage.getItem(`newsletter_cache_${newsletterId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed?.id) return parsed;
        } catch (_) {}
      }
      // Try frontend entity access first (dataEnv:'prod') — works for prod-env IDs
      try {
        const records = await base44.entities.NewsletterItem.filter({ id: newsletterId });
        if (records?.[0]) return records[0];
      } catch (_) {}
      // Fall back to getNewsletter (asServiceRole) — works for backend-env IDs
      const response = await base44.functions.invoke('getNewsletter', { newsletterId });
      const result = (response?.data ?? response)?.newsletter || null;
      if (!result) throw new Error('Newsletter not yet available');
      return result;
    },
    enabled: !!newsletterId,
    retry: 6,
    retryDelay: (attempt) => Math.min(2000 * (attempt + 1), 8000),
  });

  // Clear sessionStorage before refetching so we always get fresh server data
  const handleRefresh = () => {
    try { sessionStorage.removeItem(`newsletter_cache_${newsletterId}`); } catch (_) {}
    refetch();
  };

  const sentimentColors = {
    positive: "bg-green-100 text-green-800 border-green-200",
    neutral: "bg-slate-100 text-slate-800 border-slate-200",
    negative: "bg-red-100 text-red-800 border-red-200",
    mixed: "bg-yellow-100 text-yellow-800 border-yellow-200"
  };

  const sendToEmail = async () => {
    if (!recipientEmail) {
      toast.error("Please enter a recipient email");
      return;
    }

    setIsSendingEmail(true);
    try {
      const subject = `Healthcare Intelligence: ${newsletter.title}`;
      
      let body = `<h2>${newsletter.title}</h2>\n\n`;
      
      if (newsletter.sentiment) {
        body += `<p><strong>Sentiment:</strong> ${newsletter.sentiment}</p>\n`;
      }
      
      if (newsletter.tldr) {
        body += `<h3>TL;DR</h3>\n<p>${newsletter.tldr}</p>\n\n`;
      }
      
      if (newsletter.summary) {
        body += `<h3>Executive Summary</h3>\n<p>${newsletter.summary}</p>\n\n`;
      }
      
      if (newsletter.key_takeaways && newsletter.key_takeaways.length > 0) {
        body += `<h3>Key Takeaways</h3>\n<ul>\n`;
        newsletter.key_takeaways.forEach(takeaway => {
          body += `<li>${takeaway}</li>\n`;
        });
        body += `</ul>\n\n`;
      }
      
      if (newsletter.recommended_actions && newsletter.recommended_actions.length > 0) {
        body += `<h3>Recommended Actions</h3>\n<ol>\n`;
        newsletter.recommended_actions.forEach(action => {
          body += `<li>${action}</li>\n`;
        });
        body += `</ol>\n\n`;
      }
      
      if (newsletter.ma_activities && newsletter.ma_activities.length > 0) {
        body += `<h3>M&A Activity</h3>\n`;
        newsletter.ma_activities.forEach(deal => {
          body += `<p><strong>${deal.acquirer} → ${deal.target}</strong>`;
          if (deal.deal_value) body += ` - ${deal.deal_value}`;
          body += `<br>${deal.description}</p>\n`;
        });
        body += `\n`;
      }
      
      if (newsletter.source_url) {
        body += `<p><a href="${newsletter.source_url}">View Original Source</a></p>`;
      }

      await base44.integrations.Core.SendEmail({
        to: recipientEmail,
        subject,
        body
      });

      toast.success(`Newsletter sent to ${recipientEmail}`);
      setShowEmailDialog(false);
      setRecipientEmail("");
    } catch (error) {
      toast.error("Failed to send email");
      console.error(error);
    }
    setIsSendingEmail(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-10 max-w-6xl mx-auto w-full overflow-x-hidden">
        <Skeleton className="h-8 w-48 mb-8" />
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-24 w-full mb-8" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (isError || (!isLoading && !newsletter)) {
    return (
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-medium text-slate-600 mb-1">Newsletter not found</p>
          <p className="text-sm mb-6">This article may still be processing. Try refreshing in a moment.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl("Dashboard"))}
          className="hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex gap-2">
          <Button
            onClick={exportPDF}
            disabled={isExportingPDF || !newsletter}
            variant="outline"
            className="bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-700"
          >
            {isExportingPDF ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
            ) : (
              <><Download className="w-4 h-4 mr-2" />Download PDF</>
            )}
          </Button>
          <Button
            onClick={() => setShowEmailDialog(true)}
            variant="outline"
            className="bg-blue-50 border-blue-200 hover:bg-blue-100"
          >
            <Mail className="w-4 h-4 mr-2" />
            Send to Email
          </Button>
          <EnhanceSummaryButton newsletter={newsletter} onEnhanced={refetch} />
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/60 p-8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 mb-3">{newsletter.title}</h1>
            {newsletter.source_url && (
              <a
                href={newsletter.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 mb-3"
              >
                <ExternalLink className="w-3 h-3" />
                {newsletter.source_url}
              </a>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {newsletter.publication_date && !isNaN(new Date(newsletter.publication_date).getTime()) 
                  ? format(new Date(newsletter.publication_date), "MMM d, yyyy") 
                  : "Date not available"}
              </div>
              {newsletter.sentiment && (
                <Badge className={`${sentimentColors[newsletter.sentiment]} border font-medium`}>
                  {newsletter.sentiment}
                </Badge>
              )}
            </div>
          </div>

        </div>

        {newsletter.tldr && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mt-6">
            <EditableNewsletterSection
              newsletterId={newsletter.id}
              fieldName="tldr"
              value={newsletter.tldr}
              title="TL;DR"
              type="text"
              onUpdate={refetch}
            />
          </div>
        )}

        {/* BD Action Prompt — top placement */}
        <div className="mt-6">
          <BDActionPrompt
            type={newsletter.ma_activities?.length > 0 || newsletter.funding_rounds?.length > 0 ? "deal" : "newsletter"}
            context={
              newsletter.ma_activities?.length > 0
                ? `${newsletter.ma_activities.length} M&A deal(s) detected. Consider reaching out to involved parties or tracking these companies.`
                : newsletter.funding_rounds?.length > 0
                ? `${newsletter.funding_rounds.length} funding event(s) identified. These companies may need advisory services.`
                : `This newsletter contains ${newsletter.key_takeaways?.length || 0} insights that could support client conversations or outreach.`
            }
            contextData={{
              title: newsletter.title,
              summary: newsletter.tldr || newsletter.summary,
              companies: newsletter.key_players,
              deals: newsletter.ma_activities?.map(m => `${m.acquirer} acquiring ${m.target}`).join("; ") ||
                     newsletter.funding_rounds?.map(f => `${f.company} raised ${f.amount}`).join("; "),
              themes: newsletter.themes?.map(t => t.theme)
            }}
          />
        </div>

      </div>

      {newsletter.key_statistics && newsletter.key_statistics.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 mb-6">
          <CardHeader className="border-b border-slate-200/60">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Key Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              {newsletter.key_statistics.map((stat, index) => (
                <div key={index} className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                  <div className="text-2xl font-bold text-indigo-900 mb-1">{stat.figure}</div>
                  <p className="text-sm text-slate-700">{stat.context}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {newsletter.recommended_actions && newsletter.recommended_actions.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 mb-6">
          <CardHeader className="border-b border-slate-200/60">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-amber-600" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <EditableNewsletterSection
              newsletterId={newsletter.id}
              fieldName="recommended_actions"
              value={newsletter.recommended_actions}
              title=""
              type="array"
              onUpdate={refetch}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {newsletter.key_takeaways && newsletter.key_takeaways.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
            <CardHeader className="border-b border-slate-200/60">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Key Takeaways
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <EditableNewsletterSection
                newsletterId={newsletter.id}
                fieldName="key_takeaways"
                value={newsletter.key_takeaways}
                title=""
                type="array"
                onUpdate={refetch}
              />
            </CardContent>
          </Card>
        )}

        {newsletter.themes && newsletter.themes.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
            <CardHeader className="border-b border-slate-200/60">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-purple-600" />
                Major Themes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {newsletter.themes.map((theme, index) => (
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

      {newsletter.ma_activities && newsletter.ma_activities.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 mb-6">
          <CardHeader className="border-b border-slate-200/60">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-green-600" />
              M&A Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {newsletter.ma_activities.map((deal, index) => (
                <div key={index} className="bg-green-50 rounded-xl p-5 border border-green-100">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {deal.acquirer} → {deal.target}
                      </p>
                      {deal.deal_value && (
                        <p className="text-green-700 font-medium mt-1">{deal.deal_value}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-700 text-sm mt-2">{deal.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {newsletter.funding_rounds && newsletter.funding_rounds.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 mb-6">
          <CardHeader className="border-b border-slate-200/60">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Funding Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {newsletter.funding_rounds.map((funding, index) => (
                <div key={index} className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">{funding.company}</p>
                      <div className="flex items-center gap-2 mt-1">
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
                  </div>
                  <p className="text-slate-700 text-sm mt-2">{funding.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {newsletter.key_players && newsletter.key_players.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 mb-6">
          <CardHeader className="border-b border-slate-200/60">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-600" />
              Key Players
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {newsletter.key_players.map((player, index) => (
                <Badge key={index} variant="outline" className="text-sm py-2 px-4">
                  {player}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Newsletter via Email</DialogTitle>
            <DialogDescription>
              Enter the recipient's email address to send this healthcare intelligence newsletter.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendToEmail()}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={sendToEmail}
              disabled={isSendingEmail}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSendingEmail ? (
                <>
                  <Mail className="w-4 h-4 mr-2 animate-pulse" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}