import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { newsletterId, newsletterData } = body;

    // Try DB lookup first; fall back to inline data passed from frontend
    let a = null;
    if (newsletterId) {
      try {
        a = await base44.asServiceRole.entities.NewsletterItem.get(newsletterId);
      } catch (_) {
        // not found in DB — will use inline data below
      }
    }
    if (!a && newsletterData) {
      a = newsletterData;
    }
    if (!a) return Response.json({ error: 'Newsletter not found and no inline data provided' }, { status: 404 });

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const PW = doc.internal.pageSize.getWidth();   // 612
    const PH = doc.internal.pageSize.getHeight();  // 792
    const ML = 48, MR = 48, MT = 48;
    const CW = PW - ML - MR; // content width
    let y = MT;

    const BRAND_DARK   = [15, 23, 42];    // slate-900
    BRAND_DARK.toString = () => '';
    const BRAND_BLUE   = [30, 64, 175];   // blue-800
    const BRAND_LIGHT  = [248, 250, 252]; // slate-50
    const SLATE_600    = [71, 85, 105];
    const SLATE_400    = [148, 163, 184];
    const GREEN        = [22, 163, 74];
    const PURPLE       = [126, 34, 206];
    const INDIGO       = [79, 70, 229];
    const EMERALD      = [5, 150, 105];

    const checkPage = (needed = 40) => {
      if (y + needed > PH - 40) { doc.addPage(); y = MT; }
    };

    const txt = (text, x, yy, opts = {}) => {
      const { size = 10, style = 'normal', color = SLATE_600, maxW, align = 'left' } = opts;
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
      doc.setTextColor(...color);
      if (maxW) {
        const lines = doc.splitTextToSize(String(text), maxW);
        doc.text(lines, x, yy, { align });
        return lines.length * (size * 1.35);
      }
      doc.text(String(text), x, yy, { align });
      return size * 1.35;
    };

    const block = (text, opts = {}) => {
      const { size = 10, style = 'normal', color = SLATE_600, indent = 0, extraGap = 6 } = opts;
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(String(text || ''), CW - indent);
      const lineH = size * 1.45;
      lines.forEach(line => {
        checkPage(lineH + 4);
        doc.text(line, ML + indent, y);
        y += lineH;
      });
      y += extraGap;
    };

    const sectionHeader = (title) => {
      checkPage(36);
      y += 8;
      // Accent bar
      doc.setFillColor(...BRAND_BLUE);
      doc.rect(ML, y - 11, 3, 14, 'F');
      txt(title, ML + 10, y, { size: 13, style: 'bold', color: BRAND_BLUE });
      y += 6;
      // Thin rule
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(ML, y, PW - MR, y);
      y += 10;
    };

    const pill = (label, x, yy, bgRgb, textRgb) => {
      doc.setFillColor(...bgRgb);
      doc.roundedRect(x, yy - 10, doc.getTextWidth(label) + 12, 14, 3, 3, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textRgb);
      doc.text(label, x + 6, yy);
    };

    // ── HEADER BAND ──────────────────────────────────────────────────
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(0, 0, PW, 90, 'F');

    // "HealthInsight" wordmark
    txt('HealthInsight', ML, 34, { size: 18, style: 'bold', color: [255, 255, 255] });
    txt('Healthcare Intelligence Platform', ML, 50, { size: 9, style: 'normal', color: [147, 197, 253] });

    // Generated date — top right
    const genDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    txt(`Generated ${genDate}`, PW - MR, 34, { size: 8, color: [147, 197, 253], align: 'right' });
    txt('Confidential — For Internal Use Only', PW - MR, 46, { size: 7, color: [147, 197, 253], align: 'right' });

    y = 110;

    // ── TITLE ────────────────────────────────────────────────────────
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_DARK);
    const titleLines = doc.splitTextToSize(a.title || 'Newsletter Analysis', CW);
    titleLines.forEach(line => { doc.text(line, ML, y); y += 26; });
    y += 4;

    // Source + date row
    if (a.source_name || a.publication_date) {
      const meta = [a.source_name, a.publication_date].filter(Boolean).join('  ·  ');
      txt(meta, ML, y, { size: 9, color: SLATE_400 });
      y += 14;
    }
    if (a.source_url) {
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.textWithLink(a.source_url.length > 90 ? a.source_url.slice(0, 87) + '…' : a.source_url, ML, y, { url: a.source_url });
      y += 14;
    }

    // Sentiment / market sentiment pills
    const sentMap = { positive: [[220, 252, 231], [22, 101, 52]], negative: [[254, 226, 226], [153, 27, 27]], neutral: [[241, 245, 249], [51, 65, 85]], mixed: [[254, 249, 195], [133, 77, 14]], bullish: [[220, 252, 231], [22, 101, 52]], bearish: [[254, 226, 226], [153, 27, 27]] };
    let pillX = ML;
    y += 4;
    if (a.sentiment) {
      const [bg, fg] = sentMap[a.sentiment] || sentMap.neutral;
      const label = `Sentiment: ${a.sentiment.charAt(0).toUpperCase() + a.sentiment.slice(1)}`;
      pill(label, pillX, y, bg, fg);
      pillX += doc.getTextWidth(label) + 22;
    }
    if (a.market_sentiment) {
      const [bg, fg] = sentMap[a.market_sentiment] || sentMap.neutral;
      const label = `Market: ${a.market_sentiment.charAt(0).toUpperCase() + a.market_sentiment.slice(1)}`;
      pill(label, pillX, y, bg, fg);
      pillX += doc.getTextWidth(label) + 22;
    }
    if (a.primary_sector) {
      pill(a.primary_sector, pillX, y, [239, 246, 255], [29, 78, 216]);
    }
    y += 20;

    // Rule below title block
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(ML, y, PW - MR, y);
    y += 16;

    // ── TL;DR BOX ────────────────────────────────────────────────────
    if (a.tldr) {
      checkPage(60);
      const tldrLines = doc.splitTextToSize(a.tldr, CW - 24);
      const boxH = tldrLines.length * 14 + 28;
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(147, 197, 253);
      doc.setLineWidth(0.5);
      doc.roundedRect(ML, y, CW, boxH, 6, 6, 'FD');
      doc.setFillColor(...BRAND_BLUE);
      doc.roundedRect(ML, y, CW, boxH, 6, 6, 'S');
      // Label
      txt('TL;DR', ML + 14, y + 16, { size: 8, style: 'bold', color: BRAND_BLUE });
      // Text
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 58, 138);
      tldrLines.forEach((line, i) => doc.text(line, ML + 14, y + 30 + i * 14));
      y += boxH + 16;
    }

    // ── KEY STATISTICS ───────────────────────────────────────────────
    if (a.key_statistics?.length > 0) {
      sectionHeader('Key Statistics');
      const cols = 2;
      const colW = (CW - 10) / cols;
      const statH = 52;
      for (let i = 0; i < a.key_statistics.length; i += cols) {
        checkPage(statH + 4);
        const rowStats = a.key_statistics.slice(i, i + cols);
        rowStats.forEach((stat, col) => {
          const cx = ML + col * (colW + 10);
          doc.setFillColor(238, 242, 255);
          doc.roundedRect(cx, y, colW, statH - 4, 4, 4, 'F');
          txt(stat.figure, cx + 8, y + 16, { size: 14, style: 'bold', color: INDIGO });
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...SLATE_600);
          const ctxLines = doc.splitTextToSize(stat.context || '', colW - 16);
          ctxLines.slice(0, 2).forEach((l, li) => doc.text(l, cx + 8, y + 32 + li * 11));
        });
        y += statH + 4;
      }
      y += 8;
    }

    // ── KEY TAKEAWAYS ────────────────────────────────────────────────
    if (a.key_takeaways?.length > 0) {
      sectionHeader('Key Takeaways');
      a.key_takeaways.forEach((t, i) => {
        checkPage(30);
        // Numbered circle
        doc.setFillColor(...BRAND_BLUE);
        doc.circle(ML + 8, y - 3, 7, 'F');
        txt(String(i + 1), ML + 8, y, { size: 7, style: 'bold', color: [255, 255, 255], align: 'center' });
        // Text
        const lines = doc.splitTextToSize(t, CW - 24);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...SLATE_600);
        lines.forEach((l, li) => { checkPage(16); doc.text(l, ML + 20, y + li * 14); });
        y += lines.length * 14 + 8;
      });
      y += 4;
    }

    // ── RECOMMENDED ACTIONS ──────────────────────────────────────────
    if (a.recommended_actions?.length > 0) {
      sectionHeader('Recommended Actions');
      a.recommended_actions.forEach((action, i) => {
        checkPage(30);
        doc.setFillColor(220, 252, 231);
        doc.circle(ML + 8, y - 3, 7, 'F');
        txt(String(i + 1), ML + 8, y, { size: 7, style: 'bold', color: [22, 101, 52], align: 'center' });
        const lines = doc.splitTextToSize(action, CW - 24);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...SLATE_600);
        lines.forEach((l, li) => { checkPage(16); doc.text(l, ML + 20, y + li * 14); });
        y += lines.length * 14 + 8;
      });
      y += 4;
    }

    // ── MAJOR THEMES ─────────────────────────────────────────────────
    if (a.themes?.length > 0) {
      sectionHeader('Major Themes');
      a.themes.forEach(theme => {
        checkPage(40);
        doc.setFillColor(245, 243, 255);
        doc.setDrawColor(196, 181, 253);
        doc.setLineWidth(0.5);
        const themeLines = doc.splitTextToSize(theme.description || '', CW - 28);
        const boxH = themeLines.length * 12 + 32;
        doc.roundedRect(ML, y, CW, boxH, 4, 4, 'FD');
        doc.setFillColor(...PURPLE);
        doc.rect(ML, y, 3, boxH, 'F');
        txt(theme.theme, ML + 12, y + 14, { size: 10, style: 'bold', color: PURPLE });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...SLATE_600);
        themeLines.forEach((l, li) => doc.text(l, ML + 12, y + 28 + li * 12));
        y += boxH + 8;
      });
      y += 4;
    }

    // ── M&A ACTIVITY ─────────────────────────────────────────────────
    if (a.ma_activities?.length > 0) {
      sectionHeader('M&A Activity');
      a.ma_activities.forEach(deal => {
        checkPage(60);
        const descLines = doc.splitTextToSize(deal.description || '', CW - 20);
        const boxH = descLines.length * 12 + 50;
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(134, 239, 172);
        doc.setLineWidth(0.5);
        doc.roundedRect(ML, y, CW, boxH, 4, 4, 'FD');
        txt(`${deal.acquirer || '?'} → ${deal.target || '?'}`, ML + 12, y + 16, { size: 11, style: 'bold', color: GREEN });
        let metaX = ML + 12;
        if (deal.deal_value) {
          txt(deal.deal_value, metaX, y + 30, { size: 9, style: 'bold', color: EMERALD });
          metaX += doc.getTextWidth(deal.deal_value) + 16;
        }
        if (deal.implied_multiple) txt(`Multiple: ${deal.implied_multiple}`, metaX, y + 30, { size: 9, color: SLATE_600 });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...SLATE_600);
        descLines.forEach((l, li) => doc.text(l, ML + 12, y + 42 + li * 12));
        y += boxH + 8;
      });
      y += 4;
    }

    // ── FUNDING ACTIVITY ─────────────────────────────────────────────
    if (a.funding_rounds?.length > 0) {
      sectionHeader('Funding Activity');
      a.funding_rounds.forEach(f => {
        checkPage(50);
        const descLines = doc.splitTextToSize(f.description || '', CW - 20);
        const boxH = descLines.length * 12 + 42;
        doc.setFillColor(236, 253, 245);
        doc.setDrawColor(110, 231, 183);
        doc.setLineWidth(0.5);
        doc.roundedRect(ML, y, CW, boxH, 4, 4, 'FD');
        txt(f.company, ML + 12, y + 16, { size: 11, style: 'bold', color: EMERALD });
        let metaStr = [f.amount, f.round_type].filter(Boolean).join(' · ');
        if (metaStr) txt(metaStr, ML + 12, y + 30, { size: 9, color: SLATE_600 });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...SLATE_600);
        descLines.forEach((l, li) => doc.text(l, ML + 12, y + 38 + li * 12));
        y += boxH + 8;
      });
      y += 4;
    }

    // ── KEY PLAYERS ──────────────────────────────────────────────────
    if (a.key_players?.length > 0) {
      sectionHeader('Key Players');
      let px = ML, py = y;
      a.key_players.forEach(player => {
        const w = doc.getTextWidth(player) + 16;
        if (px + w > PW - MR) { px = ML; py += 22; checkPage(22); }
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.5);
        doc.roundedRect(px, py - 12, w, 18, 4, 4, 'FD');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...SLATE_600);
        doc.text(player, px + 8, py);
        px += w + 6;
      });
      y = py + 24;
    }

    // ── FOOTER on every page ─────────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFillColor(...BRAND_BLUE);
      doc.rect(0, PH - 28, PW, 28, 'F');
      txt('HealthInsight · Healthcare Intelligence Platform', ML, PH - 10, { size: 7, style: 'normal', color: [147, 197, 253] });
      txt(`Page ${p} of ${totalPages}`, PW - MR, PH - 10, { size: 7, color: [147, 197, 253], align: 'right' });
    }

    const pdfBase64 = doc.output('datauristring'); // data:application/pdf;base64,...

    // Build a clean filename: "SourceName - YYYY-MM-DD.pdf"
    const sourcePart = (a.source_name || 'HealthInsight').replace(/[^a-z0-9\s\-]/gi, '').trim().replace(/\s+/g, '_').slice(0, 30);
    const datePart = a.publication_date
      ? a.publication_date.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const filename = `${sourcePart}_${datePart}.pdf`;

    return Response.json({ pdfBase64, filename });

  } catch (error) {
    console.error('PDF export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});