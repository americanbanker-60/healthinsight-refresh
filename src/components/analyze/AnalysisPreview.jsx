import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, TrendingUp, Lightbulb, Briefcase, DollarSign, BarChart3, CheckSquare, Download, FileText, Mail } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const sentimentColors = {
  positive: "bg-green-100 text-green-800 border-green-200",
  neutral: "bg-slate-100 text-slate-800 border-slate-200",
  negative: "bg-red-100 text-red-800 border-red-200",
  mixed: "bg-yellow-100 text-yellow-800 border-yellow-200"
};

export default function AnalysisPreview({ analysis, onSave }) {
  const [isExportingPDF, setIsExportingPDF] = React.useState(false);
  const [showEmailDialog, setShowEmailDialog] = React.useState(false);
  const [recipientEmail, setRecipientEmail] = React.useState("");
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);

  const exportToPDF = async () => {
    setIsExportingPDF(true);
    try {
      const response = await base44.functions.invoke('exportNewsletterPDF', { analysis });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${analysis.title?.replace(/[^a-z0-9]/gi, '_') || 'newsletter_analysis'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
      console.error(error);
    }
    setIsExportingPDF(false);
  };

  const sendToEmail = async () => {
    if (!recipientEmail) {
      toast.error("Please enter a recipient email");
      return;
    }

    setIsSendingEmail(true);
    try {
      const subject = `Healthcare Intelligence: ${analysis.title || 'Analysis'}`;
      
      const lines = [];
      lines.push(`<h2>${analysis.title || 'Healthcare Intelligence Analysis'}</h2>`);
      
      if (analysis.sentiment) {
        lines.push(`<p><strong>Sentiment:</strong> ${analysis.sentiment}</p>`);
      }
      
      if (analysis.tldr) {
        lines.push(`<h3>TL;DR</h3><p>${analysis.tldr}</p>`);
      }
      
      if (analysis.summary) {
        lines.push(`<h3>Executive Summary</h3><p>${analysis.summary}</p>`);
      }
      
      if (analysis.key_takeaways?.length > 0) {
        lines.push(`<h3>Key Takeaways</h3><ul>${analysis.key_takeaways.map(t => `<li>${t}</li>`).join('')}</ul>`);
      }
      
      if (analysis.recommended_actions?.length > 0) {
        lines.push(`<h3>Recommended Actions</h3><ol>${analysis.recommended_actions.map(a => `<li>${a}</li>`).join('')}</ol>`);
      }
      
      if (analysis.ma_activities?.length > 0) {
        const deals = analysis.ma_activities.map(deal => 
          `<p><strong>${deal.acquirer || ''} → ${deal.target || ''}</strong>${deal.deal_value ? ` - ${deal.deal_value}` : ''}<br/>${deal.description || ''}</p>`
        ).join('');
        lines.push(`<h3>M&A Activity</h3>${deals}`);
      }
      
      if (analysis.source_url) {
        lines.push(`<p><a href="${analysis.source_url}">View Original Source</a></p>`);
      }

      const body = lines.join('\n');

      await base44.integrations.Core.SendEmail({
        to: recipientEmail,
        subject,
        body
      });

      toast.success(`Analysis sent to ${recipientEmail}`);
      setShowEmailDialog(false);
      setRecipientEmail("");
    } catch (error) {
      console.error("Email error:", error);
      toast.error(`Failed to send email: ${error?.message || "Unknown error"}`);
    }
    setIsSendingEmail(false);
  };

  const exportToMarkdown = () => {
    // Generate markdown content
    let markdown = `# ${analysis.title}\n\n`;
    
    if (analysis.sentiment) {
      markdown += `**Sentiment:** ${analysis.sentiment}\n\n`;
    }
    
    if (analysis.publication_date) {
      markdown += `**Date:** ${analysis.publication_date}\n\n`;
    }
    
    if (analysis.source_url) {
      markdown += `**Source:** ${analysis.source_url}\n\n`;
    }
    
    markdown += `---\n\n`;
    
    if (analysis.tldr) {
      markdown += `## TL;DR\n\n${analysis.tldr}\n\n`;
    }
    
    if (analysis.summary) {
      markdown += `## Executive Summary\n\n${analysis.summary}\n\n`;
    }
    
    if (analysis.key_statistics && analysis.key_statistics.length > 0) {
      markdown += `## Key Statistics\n\n`;
      analysis.key_statistics.forEach(stat => {
        markdown += `- **${stat.figure}** - ${stat.context}\n`;
      });
      markdown += `\n`;
    }
    
    if (analysis.recommended_actions && analysis.recommended_actions.length > 0) {
      markdown += `## Recommended Actions\n\n`;
      analysis.recommended_actions.forEach((action, i) => {
        markdown += `${i + 1}. ${action}\n`;
      });
      markdown += `\n`;
    }
    
    if (analysis.key_takeaways && analysis.key_takeaways.length > 0) {
      markdown += `## Key Takeaways\n\n`;
      analysis.key_takeaways.forEach(takeaway => {
        markdown += `- ${takeaway}\n`;
      });
      markdown += `\n`;
    }
    
    if (analysis.themes && analysis.themes.length > 0) {
      markdown += `## Major Themes\n\n`;
      analysis.themes.forEach(theme => {
        markdown += `### ${theme.theme}\n${theme.description}\n\n`;
      });
    }
    
    if (analysis.ma_activities && analysis.ma_activities.length > 0) {
      markdown += `## M&A Activity\n\n`;
      analysis.ma_activities.forEach(deal => {
        markdown += `### ${deal.acquirer} → ${deal.target}\n`;
        if (deal.deal_value) markdown += `**Deal Value:** ${deal.deal_value}\n\n`;
        markdown += `${deal.description}\n\n`;
      });
    }
    
    if (analysis.funding_rounds && analysis.funding_rounds.length > 0) {
      markdown += `## Funding Activity\n\n`;
      analysis.funding_rounds.forEach(funding => {
        markdown += `### ${funding.company}\n`;
        if (funding.amount) markdown += `**Amount:** ${funding.amount}`;
        if (funding.round_type) markdown += ` (${funding.round_type})`;
        markdown += `\n\n${funding.description}\n\n`;
      });
    }
    
    if (analysis.key_players && analysis.key_players.length > 0) {
      markdown += `## Key Players\n\n`;
      markdown += analysis.key_players.join(', ') + '\n\n';
    }
    
    // Create and download the file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysis.title?.replace(/[^a-z0-9]/gi, '_') || 'newsletter_analysis'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
          {analysis.tldr && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-6">
              <h3 className="font-bold text-slate-900 mb-2 text-sm uppercase tracking-wide">TL;DR</h3>
              <p className="text-slate-800 font-medium leading-relaxed">{analysis.tldr}</p>
            </div>
          )}

          {analysis.summary && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-slate-900 mb-2">Executive Summary</h3>
              <p className="text-slate-700 leading-relaxed">{analysis.summary}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {analysis.key_statistics && analysis.key_statistics.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
          <CardHeader className="border-b border-slate-200/60">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Key Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              {analysis.key_statistics.map((stat, index) => (
                <div key={index} className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                  <div className="text-2xl font-bold text-indigo-900 mb-1">{stat.figure}</div>
                  <p className="text-sm text-slate-700">{stat.context}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {analysis.recommended_actions && analysis.recommended_actions.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
          <CardHeader className="border-b border-slate-200/60">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-amber-600" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {analysis.recommended_actions.map((action, index) => (
                <li key={index} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <span className="text-slate-700 flex-1">{action}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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
          onClick={exportToPDF}
          variant="outline"
          disabled={isExportingPDF}
        >
          {isExportingPDF ? (
            <>
              <Download className="w-4 h-4 mr-2 animate-pulse" />
              Generating PDF...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Export as PDF
            </>
          )}
        </Button>
        <Button
          onClick={exportToMarkdown}
          variant="outline"
        >
          <Download className="w-4 h-4 mr-2" />
          Export as Markdown
        </Button>
        <Button
          onClick={() => setShowEmailDialog(true)}
          variant="outline"
          className="bg-blue-50 border-blue-200 hover:bg-blue-100"
        >
          <Mail className="w-4 h-4 mr-2" />
          Send to Email
        </Button>
        <Button
          onClick={onSave}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg shadow-green-500/30"
        >
          <Save className="w-4 h-4 mr-2" />
          Save to Library
        </Button>
      </div>

      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Analysis via Email</DialogTitle>
            <DialogDescription>
              Enter the recipient's email address to send this healthcare intelligence analysis.
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
    </motion.div>
  );
}