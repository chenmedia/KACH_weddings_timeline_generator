// Fallback PDF path: draw the KACH design as vector (no external resources,
// works everywhere — used when the browser can't rasterise, e.g. Safari).
import { getMilestones, parfotoAside, albumAside } from '../../lib/milestones.js';
import { fmtDate } from '../../lib/dates.js';
import { pdfStringToBytes } from './util.js';
import { toast } from '../../ui/feedback.js';
import { themeRgbUnit } from '../../lib/themes.js';

export function vectorPDFBytes(state, locale) {
  const data = getMilestones(state, locale);
  if (!data) {
    toast(locale.alerts.pickDate, { type: 'error' });
    return;
  }
  const couple = (state.couple || '').trim();
  const place = (state.place || '').trim();

  const PW = 595.28,
    PH = 841.89,
    M = 56;
  const railX = M + 5;
  const contentX = M + 32;
  const cardX = M,
    cardW = PW - 2 * M;

  // Palette follows the chosen template so the vector fallback matches the
  // on-screen design and the raster PDF.
  const tid = state.themeId;
  const C = {
    ink: themeRgbUnit(tid, '--ink'),
    inkSoft: themeRgbUnit(tid, '--ink-soft'),
    muted: themeRgbUnit(tid, '--muted'),
    hairline: themeRgbUnit(tid, '--hairline'),
    rail: themeRgbUnit(tid, '--line'),
    surface: themeRgbUnit(tid, '--surface'),
    field: themeRgbUnit(tid, '--field-border'),
    white: [1, 1, 1],
    bg: themeRgbUnit(tid, '--bg'),
  };

  const mc = document.createElement('canvas').getContext('2d');
  const FAM = {
    Helvetica: 'Arial, Helvetica, sans-serif',
    'Helvetica-Bold': 'Arial, Helvetica, sans-serif',
    'Helvetica-Oblique': 'Arial, Helvetica, sans-serif',
    'Times-Roman': '"Times New Roman", Times, serif',
    'Times-Bold': '"Times New Roman", Times, serif',
    'Times-Italic': '"Times New Roman", Times, serif',
  };
  const BOLD = { 'Helvetica-Bold': 1, 'Times-Bold': 1 };
  const ITAL = { 'Helvetica-Oblique': 1, 'Times-Italic': 1 };
  function widthOf(s, font, size) {
    mc.font = `${ITAL[font] ? 'italic ' : ''}${BOLD[font] ? 'bold ' : ''}${size}px ${FAM[font]}`;
    return mc.measureText(String(s)).width;
  }
  function lineW(s, font, size, tr) {
    return widthOf(s, font, size) + (tr || 0) * (String(s).length - 1);
  }
  function wrap(s, font, size, maxW, tr) {
    const out = [];
    String(s)
      .split('\n')
      .forEach((par) => {
        const words = par.split(/\s+/).filter(Boolean);
        let cur = '';
        for (const w of words) {
          const test = cur ? cur + ' ' + w : w;
          if (cur && lineW(test, font, size, tr) > maxW) {
            out.push(cur);
            cur = w;
          } else cur = test;
        }
        out.push(cur);
      });
    return out;
  }

  const FONT = {
    Helvetica: 'F1',
    'Helvetica-Bold': 'F2',
    'Helvetica-Oblique': 'F3',
    'Times-Roman': 'F4',
    'Times-Bold': 'F5',
    'Times-Italic': 'F6',
  };
  function escTxt(s) {
    return String(s)
      .split('')
      .map((ch) => {
        if (ch.charCodeAt(0) > 255) return '?';
        if (ch === '\\' || ch === '(' || ch === ')') return '\\' + ch;
        return ch;
      })
      .join('');
  }
  const cf = (c) => `${c[0]} ${c[1]} ${c[2]} rg\n`;
  const cs_ = (c) => `${c[0]} ${c[1]} ${c[2]} RG\n`;

  const pages = [];
  let P = /** @type {any} */ (null),
    y = PH - M,
    inTL = false;
  function startPage() {
    P = { back: '', mid: '', front: '', railTop: null, railBot: null };
    pages.push(P);
    P.back += cf(C.bg) + `0 0 ${PW.toFixed(2)} ${PH.toFixed(2)} re f\n`;
    y = PH - M;
  }
  function finishRail() {
    if (inTL && P && P.railTop != null) {
      const top = P.railTop,
        bot = P.railBot != null ? P.railBot : y;
      if (top > bot)
        P.back +=
          cs_(C.rail) +
          `1 w ${railX.toFixed(2)} ${top.toFixed(2)} m ${railX.toFixed(2)} ${bot.toFixed(2)} l S\n`;
    }
  }
  function room(h) {
    if (y - h < M) {
      finishRail();
      startPage();
      if (inTL) {
        P.railTop = y;
        P.railBot = y;
      }
    }
  }
  function gap(h) {
    room(h);
    y -= h;
  }

  function text(buf, txt, x, yy, font, size, color, tr) {
    let s = cf(color) + `BT /${FONT[font]} ${size} Tf `;
    if (tr) s += `${tr} Tc `;
    s += `${x.toFixed(2)} ${yy.toFixed(2)} Td (${escTxt(txt)}) Tj ET\n`;
    if (tr) s += `0 Tc\n`;
    P[buf] += s;
  }
  function rect(buf, x, yy, w, h, fillC, strokeC, lw) {
    let s = '';
    if (fillC) s += cf(fillC);
    if (strokeC) s += cs_(strokeC) + `${lw || 0.8} w\n`;
    s +=
      `${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ` +
      (fillC && strokeC ? 'B\n' : fillC ? 'f\n' : 'S\n');
    P[buf] += s;
  }
  function circle(buf, cx, cy, r, fillC, strokeC, lw) {
    const k = 0.5523 * r;
    let s = '';
    if (fillC) s += cf(fillC);
    if (strokeC) s += cs_(strokeC) + `${lw || 0.8} w\n`;
    s +=
      `${(cx + r).toFixed(2)} ${cy.toFixed(2)} m ` +
      `${(cx + r).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx + k).toFixed(2)} ${(cy + r).toFixed(2)} ${cx.toFixed(2)} ${(cy + r).toFixed(2)} c ` +
      `${(cx - k).toFixed(2)} ${(cy + r).toFixed(2)} ${(cx - r).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx - r).toFixed(2)} ${cy.toFixed(2)} c ` +
      `${(cx - r).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx - k).toFixed(2)} ${(cy - r).toFixed(2)} ${cx.toFixed(2)} ${(cy - r).toFixed(2)} c ` +
      `${(cx + k).toFixed(2)} ${(cy - r).toFixed(2)} ${(cx + r).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx + r).toFixed(2)} ${cy.toFixed(2)} c ` +
      (fillC && strokeC ? 'B\n' : fillC ? 'f\n' : 'S\n');
    P[buf] += s;
  }
  function ruleC(w, color) {
    room(8);
    P.front +=
      cs_(color) +
      `0.7 w ${((PW - w) / 2).toFixed(2)} ${y.toFixed(2)} m ${((PW + w) / 2).toFixed(2)} ${y.toFixed(2)} l S\n`;
  }

  function para(s, font, size, color, opt) {
    opt = opt || {};
    const lh = opt.lh || size * 1.32;
    const x0 = opt.x != null ? opt.x : contentX;
    const tr = opt.tracking || 0;
    const w = opt.w != null ? opt.w : PW - M - x0;
    wrap(s, font, size, w, tr).forEach((ln) => {
      room(lh);
      const x = opt.align === 'center' ? (PW - lineW(ln, font, size, tr)) / 2 : x0;
      text('front', ln, x, y - size * 0.82, font, size, color, tr);
      y -= lh;
      if (inTL) P.railBot = y;
    });
  }

  function tagPill(tagText, isDay) {
    const size = 7,
      padX = 7,
      padY = 4,
      h = size + padY * 2;
    room(h + 5);
    const w = lineW(tagText, 'Helvetica', size, 1) + padX * 2;
    rect('mid', contentX, y - h, w, h, null, isDay ? C.ink : C.hairline, 0.7);
    text(
      'front',
      tagText,
      contentX + padX,
      y - h + padY + 0.5,
      'Helvetica',
      size,
      isDay ? C.ink : C.muted,
      1,
    );
    y -= h + 7;
    if (inTL) P.railBot = y;
  }

  function renderCard(a, draw, topY) {
    const padX = 16,
      innerW = cardW - padX * 2;
    let cy = topY - 18;
    const put = (txt, font, size, color, tr, lh) => {
      if (draw) text('front', txt, cardX + padX, cy - size * 0.78, font, size, color, tr || 0);
      cy -= lh;
    };
    put(a.eyebrow.toUpperCase(), 'Helvetica-Bold', 7, C.muted, 1.4, 14);
    wrap(a.title, 'Times-Bold', 13, innerW, 0).forEach((l) => put(l, 'Times-Bold', 13, C.ink, 0, 15));
    cy -= 2;
    wrap(a.desc, 'Helvetica', 9.5, innerW, 0).forEach((l) => put(l, 'Helvetica', 9.5, C.muted, 0, 13));
    if (a.seasons && a.seasons.length) {
      cy -= 4;
      wrap(a.seasonsLabel + ': ' + a.seasons.join(', '), 'Helvetica', 8.5, innerW, 0).forEach((l) =>
        put(l, 'Helvetica', 8.5, C.inkSoft, 0, 11),
      );
    }
    if (a.note) {
      cy -= 4;
      wrap(a.note, 'Helvetica-Oblique', 8.5, innerW, 0).forEach((l) =>
        put(l, 'Helvetica-Oblique', 8.5, C.inkSoft, 0, 11),
      );
    }
    return topY - cy;
  }
  function aside(a) {
    gap(8);
    const need = renderCard(a, false, 1000);
    const boxH = need + 12;
    room(boxH + 6);
    const topY = y;
    rect('mid', cardX, topY - boxH, cardW, boxH, C.surface, C.hairline, 0.8);
    renderCard(a, true, topY);
    y = topY - boxH;
    if (inTL) P.railBot = y;
    gap(16);
  }

  startPage();

  para('KACH Weddings', 'Times-Roman', 22, C.ink, { align: 'center', tracking: 3, lh: 26 });
  gap(4);
  para(locale.header.eyebrow.toUpperCase(), 'Helvetica', 8, C.muted, {
    align: 'center',
    tracking: 2.4,
    lh: 12,
  });
  gap(24);

  para(couple || locale.timeline.defaultCouple, 'Times-Roman', 27, C.ink, { align: 'center', lh: 30 });
  gap(6);
  const meta = [fmtDate(data.W, locale.dateLocale)];
  if (place) meta.push(place);
  para(meta.join('     ·     '), 'Helvetica', 9, C.muted, { align: 'center', tracking: 1.6, lh: 13 });
  gap(12);
  ruleC(46, C.ink);
  gap(30);

  inTL = true;
  P.railTop = y;
  P.railBot = y;
  let lastPhase = null;
  data.rows.forEach((r) => {
    if (r.phase !== lastPhase) {
      gap(12);
      para(r.phase.toUpperCase(), 'Helvetica-Bold', 8.5, C.muted, { x: contentX, tracking: 1.8, lh: 13 });
      gap(8);
      lastPhase = r.phase;
      if (r.phaseKey === 'planlegging') aside(parfotoAside(state, locale));
    }
    room(64);
    const markerCY = y - 6;
    circle(
      'front',
      railX,
      markerCY,
      3.4,
      r.isDay ? C.ink : C.bg,
      r.isDay ? C.ink : r.isPast ? C.rail : C.ink,
      0.9,
    );

    tagPill((r.tag || '').toUpperCase(), r.isDay);
    para(r.dateLabel, 'Times-Roman', r.isDay ? 18 : r.isBooking ? 15 : 16.5, C.ink, {
      x: contentX,
      lh: r.isDay ? 20 : 18,
    });
    if (r.weekday)
      para(r.weekday.toUpperCase(), 'Helvetica', 7.5, C.muted, { x: contentX, tracking: 1, lh: 12 });
    gap(4);
    para(r.title, 'Times-Bold', r.isDay ? 15 : 13, C.ink, { x: contentX, lh: r.isDay ? 17 : 15 });
    gap(2);
    if (r.desc) para(r.desc, 'Helvetica', 9.5, C.inkSoft, { x: contentX, lh: 13.5 });
    if (r.who) {
      gap(2);
      para(r.who, 'Helvetica-Oblique', 8.5, C.muted, { x: contentX, lh: 11.5 });
    }
    gap(16);
    if (r.key === 'gallery') aside(albumAside(state, locale));
  });
  finishRail();
  inTL = false;

  gap(14);
  P.front +=
    cs_(C.hairline) + `0.8 w ${M.toFixed(2)} ${y.toFixed(2)} m ${(PW - M).toFixed(2)} ${y.toFixed(2)} l S\n`;
  gap(20);
  para(locale.footer.sig, 'Times-Italic', 13, C.ink, { align: 'center', lh: 16 });
  gap(6);
  para('www.kachweddings.no', 'Helvetica', 8, C.muted, { align: 'center', tracking: 2, lh: 11 });

  const pageContents = pages.map((p) => p.back + p.mid + p.front);
  const objs = [];
  const add = (body) => {
    objs.push(body);
    return objs.length;
  };
  ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Times-Roman', 'Times-Bold', 'Times-Italic'].forEach(
    (fn) => add(`<< /Type /Font /Subtype /Type1 /BaseFont /${fn} /Encoding /WinAnsiEncoding >>`),
  );
  const resFonts = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'].map((f, i) => `/${f} ${i + 1} 0 R`).join(' ');
  const resources = `<< /Font << ${resFonts} >> >>`;

  const firstContent = 7;
  const firstPage = firstContent + pageContents.length;
  const pagesNum = firstPage + pageContents.length;
  const catalogNum = pagesNum + 1;

  pageContents.forEach((content) => add(`<< /Length ${content.length} >>\nstream\n${content}endstream`));
  pageContents.forEach((_, i) =>
    add(
      `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources ${resources} /Contents ${firstContent + i} 0 R >>`,
    ),
  );
  add(
    `<< /Type /Pages /Count ${pageContents.length} /Kids [${pageContents.map((_, i) => `${firstPage + i} 0 R`).join(' ')}] >>`,
  );
  add(`<< /Type /Catalog /Pages ${pagesNum} 0 R >>`);

  let pdf = '%PDF-1.4\n%âãÏÓ\n';
  const offsets = [];
  objs.forEach((body, i) => {
    offsets[i] = pdf.length;
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    pdf += String(o).padStart(10, '0') + ' 00000 n \n';
  });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root ${catalogNum} 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return pdfStringToBytes(pdf);
}
