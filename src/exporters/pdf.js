// PDF export. Primary path rasterises the on-screen timeline (DOM → SVG → image)
// with no external libraries; if the browser can't (e.g. Safari, strict sandbox)
// it falls back to a vector drawing of the design. Fonts are embedded from the
// self-hosted woff2 files, so nothing is fetched from Google.
import cssText from '../styles.css?inline';
import { getMilestones, parfotoAside, albumAside } from '../lib/milestones.js';
import { fmtDate } from '../lib/dates.js';
import { slug } from '../lib/download.js';

export async function exportPDF(state, locale, opts = {}) {
  const { refresh, button } = opts;
  const data = getMilestones(state, locale);
  if (!data) { alert(locale.alerts.pickDate); return; }
  const couple = (state.couple || '').trim();
  const prevLabel = button ? button.textContent : '';
  if (button) { button.disabled = true; button.textContent = locale.pdf.exporting; }
  let bytes = null;
  try { bytes = await withTimeout(rasterPDFBytes(refresh), 4000); } catch (e) { bytes = null; }
  if (!bytes) { try { bytes = vectorPDFBytes(state, locale); } catch (e) { bytes = null; } }
  if (button) { button.disabled = false; button.textContent = prevLabel; }
  if (!bytes) { alert(locale.pdf.error); return; }
  deliverPDF(bytes, couple, locale);
}

function pdfStringToBytes(pdf) {
  const b = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) b[i] = pdf.charCodeAt(i) & 0xff;
  return b;
}

// Timeout guard so a slow/blocked resource can't freeze the export.
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

function deliverPDF(bytes, couple, locale) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const fname = `kach-weddings-tidslinje-${slug(couple)}.pdf`;
  try {
    const a = document.createElement('a');
    a.href = url; a.download = fname;
    document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { /* download may be blocked in the sandbox */ }
  showPdfOverlay(url, fname, locale);
}

// Embed the self-hosted fonts as data URIs so the rasteriser uses Cormorant +
// Montserrat. Fails silently (falls back to system serif) if something blocks it.
async function embedFontsCSS() {
  const css = await (await fetch('/fonts/fonts.css')).text();
  const re = /url\((['"]?)([^'")]+\.woff2)\1\)/g;
  const urls = Array.from(new Set(Array.from(css.matchAll(re)).map(m => m[2])));
  const map = {};
  await Promise.all(urls.map(async u => {
    const abs = new URL(u, location.origin).href;
    const buf = await (await fetch(abs)).arrayBuffer();
    const arr = new Uint8Array(buf); let bin = '';
    for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
    map[u] = btoa(bin);
  }));
  return css.replace(re, (m, q, u) => map[u] ? `url(data:font/woff2;base64,${map[u]})` : m);
}

function isUniform(data) {
  const r = data[0], g = data[1], b = data[2];
  for (let i = 0; i < data.length; i += 4000) {
    if (Math.abs(data[i] - r) > 4 || Math.abs(data[i + 1] - g) > 4 || Math.abs(data[i + 2] - b) > 4) return false;
  }
  return true;
}

// Rasterise the timeline (DOM → SVG → image) and wrap it in a PDF. Pixel-identical to screen.
async function rasterPDFBytes(refresh) {
  if (typeof refresh === 'function') refresh();
  const src = document.querySelector('.wrap');
  if (!src) throw new Error('missing content');
  const width = 800;
  const clone = src.cloneNode(true);
  const ctrl = clone.querySelector('.controls'); if (ctrl) ctrl.remove();
  clone.style.width = width + 'px'; clone.style.maxWidth = width + 'px';
  clone.style.margin = '0'; clone.style.padding = '70px 68px';
  clone.classList.add('pdfcap');

  // Capture-only rhythm: small gaps INSIDE a milestone stay low, large gaps
  // BETWEEN blocks stay high, so page breaks land in the gaps without splitting a milestone.
  const captureCSS = `
    .pdfcap header{margin-bottom:30px}
    .pdfcap .tl-head{margin-bottom:50px}
    .pdfcap .phase-label{margin:46px 0 18px}
    .pdfcap .phase-label:first-child{margin-top:6px}
    .pdfcap .item{padding-bottom:40px}
    .pdfcap .item .tag{margin-bottom:10px}
    .pdfcap .item .date{margin-bottom:2px}
    .pdfcap .item .weekday{margin-bottom:12px}
    .pdfcap .item .title{margin-bottom:9px}
    .pdfcap .item .desc{line-height:1.6}
    .pdfcap .aside{margin:12px 0 40px;padding:22px 26px}
    .pdfcap footer{margin-top:56px;padding-top:34px}
  `;

  const holder = document.createElement('div');
  holder.style.cssText = `position:fixed;left:-99999px;top:0;width:${width}px;background:#ECEAE6;`;
  const capStyle = document.createElement('style');
  capStyle.textContent = captureCSS;
  holder.appendChild(capStyle);
  holder.appendChild(clone);
  document.body.appendChild(holder);

  let fontCSS = '';
  try { fontCSS = await withTimeout(embedFontsCSS(), 2500); } catch (e) { fontCSS = ''; }

  const scale = 2;
  const W = Math.ceil(clone.offsetWidth || width);
  const H = Math.ceil(clone.offsetHeight);
  const xml = new XMLSerializer().serializeToString(clone);

  if (holder.parentNode) holder.parentNode.removeChild(holder);
  if (!H) throw new Error('empty height');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`
    + `<foreignObject x="0" y="0" width="100%" height="100%">`
    + `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${W}px;background:#ECEAE6;">`
    + `<style>${fontCSS}${cssText}${captureCSS}</style>${xml}</div></foreignObject></svg>`;

  const img = new Image();
  await withTimeout(new Promise((res, rej) => {
    img.onload = res; img.onerror = () => rej(new Error('svg'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }), 2500);
  await new Promise(r => setTimeout(r, 60)); // let embedded fonts settle before drawing

  const cnv = document.createElement('canvas');
  cnv.width = W * scale; cnv.height = H * scale;
  const cx = cnv.getContext('2d');
  cx.fillStyle = '#ECEAE6'; cx.fillRect(0, 0, cnv.width, cnv.height);
  cx.setTransform(scale, 0, 0, scale, 0, 0);
  cx.drawImage(img, 0, 0, W, H);

  let pix;
  try { pix = cx.getImageData(0, 0, cnv.width, cnv.height).data; }
  catch (e) { throw new Error('tainted'); }
  if (isUniform(pix)) throw new Error('blank');

  const breaks = findSafeBreaks(pix, cnv.width, cnv.height);
  const contentH = contentBottom(pix, cnv.width, cnv.height);
  return imagePDFBytes(cnv, breaks, contentH, pix);
}

// Wide bands of pure background (#ECEAE6) are the only legal page-break rows.
function findSafeBreaks(data, W, H) {
  const x0 = Math.floor(W * 0.14), x1 = Math.floor(W * 0.92);
  const R = 236, G = 234, B = 230, TOL = 7;
  const MIN_BAND = 50;
  const breaks = [];
  let runStart = -1;
  for (let y = 0; y <= H; y++) {
    let bg = 1;
    if (y < H) {
      const base = y * W * 4; let bad = 0;
      for (let x = x0; x < x1; x += 3) {
        const i = base + x * 4;
        if (Math.abs(data[i] - R) > TOL || Math.abs(data[i + 1] - G) > TOL || Math.abs(data[i + 2] - B) > TOL) {
          if (++bad > 2) { bg = 0; break; }
        }
      }
    } else bg = 0;
    if (bg) { if (runStart < 0) runStart = y; }
    else { if (runStart >= 0 && (y - runStart) >= MIN_BAND) breaks.push(Math.floor((runStart + y) / 2)); runStart = -1; }
  }
  return breaks;
}

function contentBottom(data, W, H) {
  const x0 = Math.floor(W * 0.05), x1 = Math.floor(W * 0.95);
  for (let y = H - 1; y >= 0; y--) {
    const base = y * W * 4;
    for (let x = x0; x < x1; x += 2) {
      const i = base + x * 4;
      if (Math.min(data[i], data[i + 1], data[i + 2]) < 120) return Math.min(H, y + 18);
    }
  }
  return H;
}

function rangeHasInk(data, W, sy, ey) {
  const x0 = Math.floor(W * 0.05), x1 = Math.floor(W * 0.95);
  for (let y = Math.max(0, sy); y < ey; y += 2) {
    const base = y * W * 4;
    for (let x = x0; x < x1; x += 2) {
      const i = base + x * 4;
      if (Math.min(data[i], data[i + 1], data[i + 2]) < 120) return true;
    }
  }
  return false;
}

function paginate(safe, H, pageHpx) {
  const s = (safe || []).filter(b => b > 0 && b < H).sort((a, b) => a - b);
  const bounds = []; let startY = 0, guard = 0;
  while (startY < H && guard++ < 200) {
    const ideal = startY + pageHpx;
    if (ideal >= H) { bounds.push(H); break; }
    let cut = -1;
    for (const b of s) { if (b > startY + 24 && b <= ideal) cut = b; }
    if (cut < 0) cut = ideal;
    bounds.push(cut); startY = cut;
  }
  if (bounds[bounds.length - 1] !== H) bounds.push(H);
  return bounds;
}

function imagePDFBytes(cnv, breaks, contentH, pix) {
  const PW = 595.28, PH = 841.89, M = 0;
  const BG = '0.9255 0.9176 0.9020';
  const CWpt = PW - 2 * M, CHpt = PH - 2 * M;
  const Wpx = cnv.width;
  const Hpx = Math.min(contentH || cnv.height, cnv.height);
  const pxPerPt = Wpx / CWpt;
  const pageHpx = Math.max(1, Math.floor(CHpt * pxPerPt));

  const safe = (breaks || []).filter(b => b > 0 && b < Hpx).sort((a, b) => a - b);
  const bounds = paginate(safe, Hpx, pageHpx);
  const cuts = [];
  let prev = 0;
  bounds.forEach(c => { cuts.push([prev, c]); prev = c; });

  const slices = [];
  cuts.forEach(([sy, ey]) => {
    if (ey - sy < 2) return;
    if (pix && !rangeHasInk(pix, Wpx, sy, ey)) return;
    const sh = ey - sy;
    const tmp = document.createElement('canvas');
    tmp.width = Wpx; tmp.height = sh;
    const tctx = tmp.getContext('2d');
    tctx.fillStyle = '#ECEAE6'; tctx.fillRect(0, 0, Wpx, sh);
    tctx.drawImage(cnv, 0, sy, Wpx, sh, 0, 0, Wpx, sh);
    const bin = atob(tmp.toDataURL('image/jpeg', 0.92).split(',')[1]);
    slices.push({ bin, w: Wpx, h: sh, hpt: sh / pxPerPt });
  });
  if (!slices.length) {
    const sh = Hpx;
    const tmp = document.createElement('canvas'); tmp.width = Wpx; tmp.height = sh;
    const tctx = tmp.getContext('2d'); tctx.fillStyle = '#ECEAE6'; tctx.fillRect(0, 0, Wpx, sh);
    tctx.drawImage(cnv, 0, 0, Wpx, sh, 0, 0, Wpx, sh);
    slices.push({ bin: atob(tmp.toDataURL('image/jpeg', 0.92).split(',')[1]), w: Wpx, h: sh, hpt: sh / pxPerPt });
  }

  const objs = []; const add = b => { objs.push(b); return objs.length; };
  slices.forEach(s => add(`<< /Type /XObject /Subtype /Image /Width ${s.w} /Height ${s.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${s.bin.length} >>\nstream\n${s.bin}\nendstream`));
  const firstContent = objs.length + 1;
  slices.forEach(s => {
    const yB = (PH - M - s.hpt).toFixed(2);
    const c = `${BG} rg 0 0 ${PW.toFixed(2)} ${PH.toFixed(2)} re f q ${CWpt.toFixed(2)} 0 0 ${s.hpt.toFixed(2)} ${M.toFixed(2)} ${yB} cm /Im0 Do Q`;
    add(`<< /Length ${c.length} >>\nstream\n${c}\nendstream`);
  });
  const firstPage = objs.length + 1;
  const pagesNum = firstPage + slices.length;
  const catalogNum = pagesNum + 1;
  slices.forEach((s, i) => add(`<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 ${1 + i} 0 R >> >> /Contents ${firstContent + i} 0 R >>`));
  add(`<< /Type /Pages /Count ${slices.length} /Kids [${slices.map((_, i) => `${firstPage + i} 0 R`).join(' ')}] >>`);
  add(`<< /Type /Catalog /Pages ${pagesNum} 0 R >>`);

  let pdf = '%PDF-1.4\n%âãÏÓ\n';
  const offsets = [];
  objs.forEach((b, i) => { offsets[i] = pdf.length; pdf += `${i + 1} 0 obj\n${b}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(o => pdf += String(o).padStart(10, '0') + ' 00000 n \n');
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root ${catalogNum} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdfStringToBytes(pdf);
}

// Fallback: draw the KACH design as vector (no external resources, works everywhere).
function vectorPDFBytes(state, locale) {
  const data = getMilestones(state, locale);
  if (!data) { alert(locale.alerts.pickDate); return; }
  const couple = (state.couple || '').trim();
  const place = (state.place || '').trim();

  const PW = 595.28, PH = 841.89, M = 56;
  const railX = M + 5;
  const contentX = M + 32;
  const cardX = M, cardW = PW - 2 * M;

  const C = {
    ink: [0.102, 0.094, 0.086], inkSoft: [0.227, 0.216, 0.200], muted: [0.420, 0.404, 0.373],
    hairline: [0.847, 0.831, 0.804], rail: [0.788, 0.769, 0.737], surface: [0.965, 0.957, 0.945],
    field: [0.549, 0.529, 0.494], white: [1, 1, 1], bg: [0.925, 0.918, 0.902],
  };

  const mc = document.createElement('canvas').getContext('2d');
  const FAM = {
    'Helvetica': 'Arial, Helvetica, sans-serif', 'Helvetica-Bold': 'Arial, Helvetica, sans-serif',
    'Helvetica-Oblique': 'Arial, Helvetica, sans-serif', 'Times-Roman': '"Times New Roman", Times, serif',
    'Times-Bold': '"Times New Roman", Times, serif', 'Times-Italic': '"Times New Roman", Times, serif',
  };
  const BOLD = { 'Helvetica-Bold': 1, 'Times-Bold': 1 };
  const ITAL = { 'Helvetica-Oblique': 1, 'Times-Italic': 1 };
  function widthOf(s, font, size) {
    mc.font = `${ITAL[font] ? 'italic ' : ''}${BOLD[font] ? 'bold ' : ''}${size}px ${FAM[font]}`;
    return mc.measureText(String(s)).width;
  }
  function lineW(s, font, size, tr) { return widthOf(s, font, size) + (tr || 0) * (String(s).length - 1); }
  function wrap(s, font, size, maxW, tr) {
    const out = [];
    String(s).split('\n').forEach(par => {
      const words = par.split(/\s+/).filter(Boolean);
      let cur = '';
      for (const w of words) {
        const test = cur ? cur + ' ' + w : w;
        if (cur && lineW(test, font, size, tr) > maxW) { out.push(cur); cur = w; }
        else cur = test;
      }
      out.push(cur);
    });
    return out;
  }

  const FONT = { 'Helvetica': 'F1', 'Helvetica-Bold': 'F2', 'Helvetica-Oblique': 'F3', 'Times-Roman': 'F4', 'Times-Bold': 'F5', 'Times-Italic': 'F6' };
  function escTxt(s) {
    return String(s).split('').map(ch => {
      if (ch.charCodeAt(0) > 255) return '?';
      if (ch === '\\' || ch === '(' || ch === ')') return '\\' + ch;
      return ch;
    }).join('');
  }
  const cf = c => `${c[0]} ${c[1]} ${c[2]} rg\n`;
  const cs_ = c => `${c[0]} ${c[1]} ${c[2]} RG\n`;

  const pages = [];
  let P = null, y = PH - M, inTL = false;
  function startPage() { P = { back: '', mid: '', front: '', railTop: null, railBot: null }; pages.push(P); P.back += cf(C.bg) + `0 0 ${PW.toFixed(2)} ${PH.toFixed(2)} re f\n`; y = PH - M; }
  function finishRail() {
    if (inTL && P && P.railTop != null) {
      const top = P.railTop, bot = (P.railBot != null ? P.railBot : y);
      if (top > bot) P.back += cs_(C.rail) + `1 w ${railX.toFixed(2)} ${top.toFixed(2)} m ${railX.toFixed(2)} ${bot.toFixed(2)} l S\n`;
    }
  }
  function room(h) {
    if (y - h < M) { finishRail(); startPage(); if (inTL) { P.railTop = y; P.railBot = y; } }
  }
  function gap(h) { room(h); y -= h; }

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
    s += `${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ` + (fillC && strokeC ? 'B\n' : fillC ? 'f\n' : 'S\n');
    P[buf] += s;
  }
  function circle(buf, cx, cy, r, fillC, strokeC, lw) {
    const k = 0.5523 * r;
    let s = '';
    if (fillC) s += cf(fillC);
    if (strokeC) s += cs_(strokeC) + `${lw || 0.8} w\n`;
    s += `${(cx + r).toFixed(2)} ${cy.toFixed(2)} m `
      + `${(cx + r).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx + k).toFixed(2)} ${(cy + r).toFixed(2)} ${cx.toFixed(2)} ${(cy + r).toFixed(2)} c `
      + `${(cx - k).toFixed(2)} ${(cy + r).toFixed(2)} ${(cx - r).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx - r).toFixed(2)} ${cy.toFixed(2)} c `
      + `${(cx - r).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx - k).toFixed(2)} ${(cy - r).toFixed(2)} ${cx.toFixed(2)} ${(cy - r).toFixed(2)} c `
      + `${(cx + k).toFixed(2)} ${(cy - r).toFixed(2)} ${(cx + r).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx + r).toFixed(2)} ${cy.toFixed(2)} c `
      + (fillC && strokeC ? 'B\n' : fillC ? 'f\n' : 'S\n');
    P[buf] += s;
  }
  function ruleC(w, color) {
    room(8);
    P.front += cs_(color) + `0.7 w ${((PW - w) / 2).toFixed(2)} ${y.toFixed(2)} m ${((PW + w) / 2).toFixed(2)} ${y.toFixed(2)} l S\n`;
  }

  function para(s, font, size, color, opt) {
    opt = opt || {};
    const lh = opt.lh || size * 1.32;
    const x0 = opt.x != null ? opt.x : contentX;
    const tr = opt.tracking || 0;
    const w = opt.w != null ? opt.w : (PW - M - x0);
    wrap(s, font, size, w, tr).forEach(ln => {
      room(lh);
      const x = opt.align === 'center' ? (PW - lineW(ln, font, size, tr)) / 2 : x0;
      text('front', ln, x, y - size * 0.82, font, size, color, tr);
      y -= lh;
      if (inTL) P.railBot = y;
    });
  }

  function tagPill(tagText, isDay) {
    const size = 7, padX = 7, padY = 4, h = size + padY * 2;
    room(h + 5);
    const w = lineW(tagText, 'Helvetica', size, 1) + padX * 2;
    rect('mid', contentX, y - h, w, h, null, isDay ? C.ink : C.hairline, 0.7);
    text('front', tagText, contentX + padX, y - h + padY + 0.5, 'Helvetica', size, isDay ? C.ink : C.muted, 1);
    y -= h + 7;
    if (inTL) P.railBot = y;
  }

  function renderCard(a, draw, topY) {
    const padX = 16, innerW = cardW - padX * 2;
    let cy = topY - 18;
    const put = (txt, font, size, color, tr, lh) => { if (draw) text('front', txt, cardX + padX, cy - size * 0.78, font, size, color, tr || 0); cy -= lh; };
    put(a.eyebrow.toUpperCase(), 'Helvetica-Bold', 7, C.muted, 1.4, 14);
    wrap(a.title, 'Times-Bold', 13, innerW, 0).forEach(l => put(l, 'Times-Bold', 13, C.ink, 0, 15));
    cy -= 2;
    wrap(a.desc, 'Helvetica', 9.5, innerW, 0).forEach(l => put(l, 'Helvetica', 9.5, C.muted, 0, 13));
    if (a.seasons && a.seasons.length) {
      cy -= 4;
      wrap(a.seasonsLabel + ': ' + a.seasons.join(', '), 'Helvetica', 8.5, innerW, 0).forEach(l => put(l, 'Helvetica', 8.5, C.inkSoft, 0, 11));
    }
    if (a.note) {
      cy -= 4;
      wrap(a.note, 'Helvetica-Oblique', 8.5, innerW, 0).forEach(l => put(l, 'Helvetica-Oblique', 8.5, C.inkSoft, 0, 11));
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
  para(locale.header.eyebrow.toUpperCase(), 'Helvetica', 8, C.muted, { align: 'center', tracking: 2.4, lh: 12 });
  gap(24);

  para(couple || locale.timeline.defaultCouple, 'Times-Roman', 27, C.ink, { align: 'center', lh: 30 });
  gap(6);
  const meta = [fmtDate(data.W, locale.dateLocale)]; if (place) meta.push(place);
  para(meta.join('     ·     '), 'Helvetica', 9, C.muted, { align: 'center', tracking: 1.6, lh: 13 });
  gap(12);
  ruleC(46, C.ink);
  gap(30);

  inTL = true; P.railTop = y; P.railBot = y;
  let lastPhase = null;
  data.rows.forEach(r => {
    if (r.phase !== lastPhase) {
      gap(12);
      para(r.phase.toUpperCase(), 'Helvetica-Bold', 8.5, C.muted, { x: contentX, tracking: 1.8, lh: 13 });
      gap(8);
      lastPhase = r.phase;
      if (r.phaseKey === 'planlegging') aside(parfotoAside(state, locale));
    }
    room(64);
    const markerCY = y - 6;
    circle('front', railX, markerCY, 3.4,
      r.isDay ? C.ink : C.bg,
      r.isDay ? C.ink : (r.isPast ? C.rail : C.ink), 0.9);

    tagPill((r.tag || '').toUpperCase(), r.isDay);
    para(r.dateLabel, 'Times-Roman', r.isDay ? 18 : (r.isBooking ? 15 : 16.5), C.ink, { x: contentX, lh: (r.isDay ? 20 : 18) });
    if (r.weekday) para(r.weekday.toUpperCase(), 'Helvetica', 7.5, C.muted, { x: contentX, tracking: 1, lh: 12 });
    gap(4);
    para(r.title, 'Times-Bold', r.isDay ? 15 : 13, C.ink, { x: contentX, lh: (r.isDay ? 17 : 15) });
    gap(2);
    if (r.desc) para(r.desc, 'Helvetica', 9.5, C.inkSoft, { x: contentX, lh: 13.5 });
    if (r.who) { gap(2); para(r.who, 'Helvetica-Oblique', 8.5, C.muted, { x: contentX, lh: 11.5 }); }
    gap(16);
    if (r.key === 'gallery') aside(albumAside(state, locale));
  });
  finishRail();
  inTL = false;

  gap(14);
  P.front += cs_(C.hairline) + `0.8 w ${M.toFixed(2)} ${y.toFixed(2)} m ${(PW - M).toFixed(2)} ${y.toFixed(2)} l S\n`;
  gap(20);
  para(locale.footer.sig, 'Times-Italic', 13, C.ink, { align: 'center', lh: 16 });
  gap(6);
  para('www.kachweddings.no', 'Helvetica', 8, C.muted, { align: 'center', tracking: 2, lh: 11 });

  const pageContents = pages.map(p => p.back + p.mid + p.front);
  const objs = [];
  const add = body => { objs.push(body); return objs.length; };
  ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Times-Roman', 'Times-Bold', 'Times-Italic']
    .forEach(fn => add(`<< /Type /Font /Subtype /Type1 /BaseFont /${fn} /Encoding /WinAnsiEncoding >>`));
  const resFonts = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'].map((f, i) => `/${f} ${i + 1} 0 R`).join(' ');
  const resources = `<< /Font << ${resFonts} >> >>`;

  const firstContent = 7;
  const firstPage = firstContent + pageContents.length;
  const pagesNum = firstPage + pageContents.length;
  const catalogNum = pagesNum + 1;

  pageContents.forEach(content => add(`<< /Length ${content.length} >>\nstream\n${content}endstream`));
  pageContents.forEach((_, i) => add(`<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources ${resources} /Contents ${firstContent + i} 0 R >>`));
  add(`<< /Type /Pages /Count ${pageContents.length} /Kids [${pageContents.map((_, i) => `${firstPage + i} 0 R`).join(' ')}] >>`);
  add(`<< /Type /Catalog /Pages ${pagesNum} 0 R >>`);

  let pdf = '%PDF-1.4\n%âãÏÓ\n';
  const offsets = [];
  objs.forEach((body, i) => { offsets[i] = pdf.length; pdf += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(o => { pdf += String(o).padStart(10, '0') + ' 00000 n \n'; });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root ${catalogNum} 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return pdfStringToBytes(pdf);
}

function showPdfOverlay(url, fname, locale) {
  const old = document.getElementById('pdfOverlay');
  if (old) old.remove();

  const ov = document.createElement('div');
  ov.id = 'pdfOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(26,24,22,.55);display:flex;flex-direction:column;padding:20px;box-sizing:border-box;';

  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:12px;align-items:center;justify-content:space-between;background:#F6F4F1;border:1px solid #D8D4CD;padding:12px 16px;border-radius:8px 8px 0 0;flex:0 0 auto;';
  const title = document.createElement('span');
  title.textContent = locale.pdf.overlayTitle;
  title.style.cssText = 'font-family:Montserrat,system-ui,sans-serif;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#1A1816;';
  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;';
  const dl = document.createElement('a');
  dl.href = url; dl.download = fname; dl.textContent = locale.pdf.download;
  dl.style.cssText = 'font-family:Montserrat,system-ui,sans-serif;font-size:13px;text-decoration:none;background:#1A1816;color:#F6F4F1;padding:8px 18px;border-radius:4px;';
  const open = document.createElement('a');
  open.href = url; open.target = '_blank'; open.rel = 'noopener'; open.textContent = locale.pdf.openTab;
  open.style.cssText = 'font-family:Montserrat,system-ui,sans-serif;font-size:13px;text-decoration:none;background:transparent;border:1px solid #8C877E;color:#1A1816;padding:8px 18px;border-radius:4px;';
  const close = document.createElement('button');
  close.type = 'button'; close.textContent = locale.pdf.close;
  close.style.cssText = 'font-family:Montserrat,system-ui,sans-serif;font-size:13px;background:transparent;border:1px solid #8C877E;color:#1A1816;padding:8px 18px;border-radius:4px;cursor:pointer;';
  close.addEventListener('click', () => { ov.remove(); try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } });
  btns.appendChild(dl); btns.appendChild(open); btns.appendChild(close);
  bar.appendChild(title); bar.appendChild(btns);

  const hint = document.createElement('div');
  hint.textContent = locale.pdf.hint;
  hint.style.cssText = 'font-family:Montserrat,system-ui,sans-serif;font-size:11px;color:#6B675F;background:#F6F4F1;border:1px solid #D8D4CD;border-top:none;padding:8px 16px;flex:0 0 auto;';

  const frame = document.createElement('iframe');
  frame.src = url; frame.title = 'PDF';
  frame.style.cssText = 'flex:1 1 auto;width:100%;border:1px solid #D8D4CD;border-top:none;border-radius:0 0 8px 8px;background:#fff;min-height:0;';

  ov.appendChild(bar); ov.appendChild(hint); ov.appendChild(frame);
  document.body.appendChild(ov);
}
