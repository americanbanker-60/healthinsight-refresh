import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { analysis } = await req.json();

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxWidth = pageWidth - 2 * margin;
        let yPos = 20;

        // Helper to add text with word wrap and page breaks
        const addText = (text, fontSize = 10, fontStyle = 'normal', color = [0, 0, 0]) => {
            doc.setFontSize(fontSize);
            doc.setFont('helvetica', fontStyle);
            doc.setTextColor(...color);
            
            const lines = doc.splitTextToSize(text, maxWidth);
            
            lines.forEach(line => {
                if (yPos > pageHeight - 20) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(line, margin, yPos);
                yPos += fontSize * 0.5;
            });
            yPos += 5;
        };

        const addSection = (title, fontSize = 12) => {
            yPos += 5;
            if (yPos > pageHeight - 30) {
                doc.addPage();
                yPos = 20;
            }
            doc.setFontSize(fontSize);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 64, 175); // Blue
            doc.text(title, margin, yPos);
            yPos += 8;
        };

        // Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // Slate-900
        const titleLines = doc.splitTextToSize(analysis.title || 'Newsletter Analysis', maxWidth);
        titleLines.forEach(line => {
            doc.text(line, margin, yPos);
            yPos += 9;
        });
        yPos += 5;

        // Metadata
        if (analysis.sentiment) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(`Sentiment: ${analysis.sentiment}`, margin, yPos);
            yPos += 6;
        }

        if (analysis.publication_date) {
            doc.text(`Date: ${analysis.publication_date}`, margin, yPos);
            yPos += 6;
        }

        if (analysis.source_url) {
            doc.textWithLink('Source URL', margin, yPos, { url: analysis.source_url });
            yPos += 10;
        }

        // Divider
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;

        // TL;DR
        if (analysis.tldr) {
            addSection('TL;DR', 14);
            addText(analysis.tldr, 10, 'normal', [51, 65, 85]);
        }

        // Executive Summary
        if (analysis.summary) {
            addSection('Executive Summary', 14);
            addText(analysis.summary, 10, 'normal', [51, 65, 85]);
        }

        // Key Statistics
        if (analysis.key_statistics && analysis.key_statistics.length > 0) {
            addSection('Key Statistics', 14);
            analysis.key_statistics.forEach(stat => {
                addText(`${stat.figure}`, 11, 'bold', [79, 70, 229]);
                addText(stat.context, 9, 'normal', [71, 85, 105]);
            });
        }

        // Recommended Actions
        if (analysis.recommended_actions && analysis.recommended_actions.length > 0) {
            addSection('Recommended Actions', 14);
            analysis.recommended_actions.forEach((action, i) => {
                addText(`${i + 1}. ${action}`, 10, 'normal', [51, 65, 85]);
            });
        }

        // Key Takeaways
        if (analysis.key_takeaways && analysis.key_takeaways.length > 0) {
            addSection('Key Takeaways', 14);
            analysis.key_takeaways.forEach(takeaway => {
                addText(`• ${takeaway}`, 10, 'normal', [51, 65, 85]);
            });
        }

        // Major Themes
        if (analysis.themes && analysis.themes.length > 0) {
            addSection('Major Themes', 14);
            analysis.themes.forEach(theme => {
                addText(theme.theme, 11, 'bold', [126, 34, 206]);
                addText(theme.description, 9, 'normal', [71, 85, 105]);
            });
        }

        // M&A Activity
        if (analysis.ma_activities && analysis.ma_activities.length > 0) {
            addSection('M&A Activity', 14);
            analysis.ma_activities.forEach(deal => {
                addText(`${deal.acquirer} → ${deal.target}`, 11, 'bold', [22, 163, 74]);
                if (deal.deal_value) {
                    addText(deal.deal_value, 10, 'bold', [5, 150, 105]);
                }
                addText(deal.description, 9, 'normal', [71, 85, 105]);
                yPos += 3;
            });
        }

        // Funding Activity
        if (analysis.funding_rounds && analysis.funding_rounds.length > 0) {
            addSection('Funding Activity', 14);
            analysis.funding_rounds.forEach(funding => {
                let fundingText = funding.company;
                if (funding.amount) fundingText += ` - ${funding.amount}`;
                if (funding.round_type) fundingText += ` (${funding.round_type})`;
                addText(fundingText, 11, 'bold', [16, 185, 129]);
                addText(funding.description, 9, 'normal', [71, 85, 105]);
                yPos += 3;
            });
        }

        // Key Players
        if (analysis.key_players && analysis.key_players.length > 0) {
            addSection('Key Players', 14);
            addText(analysis.key_players.join(', '), 10, 'normal', [51, 65, 85]);
        }

        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${analysis.title?.replace(/[^a-z0-9]/gi, '_') || 'newsletter_analysis'}.pdf"`
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});