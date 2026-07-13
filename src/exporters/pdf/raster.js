// Primary PDF path: rasterise the on-screen timeline (DOM → SVG → image) and
// paginate it into an A4 PDF, breaking only in wide bands of pure background so
// no milestone is ever split. No external libraries.
import cssText from '../../styles.css?inline';
import { withTimeout, pdfStringToBytes } from './util.js';
import { embedFontsCSS } from './fonts.js';
import { themeVars, hexToRgb, themeRgbUnit } from '../../lib/themes.js';

function isUniform(data) {
  const r = data[0],
    g = data[1],
    b = data[2];
  for (let i = 0; i < data.length; i += 4000) {
    if (Math.abs(data[i] - r) > 4 || Math.abs(data[i + 1] - g) > 4 || Math.abs(data[i + 2] - b) > 4)
      return false;
  }
  return true;
}

export async function rasterPDFBytes(refresh, themeId) {
  if (typeof refresh === 'function') refresh();
  const src = document.querySelector('.wrap');
  if (!src) throw new Error('missing content');
  // The paper colour follows the chosen template — page background, break
  // detection and the page-fill operator all key off it (not a fixed grey).
  const bgHex = themeVars(themeId)['--bg'];
  const bgRgb = hexToRgb(bgHex);
  const bgUnit = themeRgbUnit(themeId, '--bg').join(' ');
  const width = 800;
  const clone = /** @type {HTMLElement} */ (src.cloneNode(true));
  // Strip everything the print stylesheet hides (nav, dashboard, share panel,
  // controls, langbar …) so the PDF captures only the timeline + header.
  clone.querySelectorAll('.no-print').forEach((n) => n.remove());
  clone.style.width = width + 'px';
  clone.style.maxWidth = width + 'px';
  clone.style.margin = '0';
  clone.style.padding = '70px 68px';
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
    .pdfcap.app-shell{display:block}
    .pdfcap .app-body{display:block}
    .pdfcap .app-canvas{max-width:none;margin:0;padding:0}
    .pdfcap .tl-workspace{display:block}
    .pdfcap .tl-detail{min-width:0}
  `;

  const holder = document.createElement('div');
  holder.style.cssText = `position:fixed;left:-99999px;top:0;width:${width}px;background:${bgHex};`;
  const capStyle = document.createElement('style');
  capStyle.textContent = captureCSS;
  holder.appendChild(capStyle);
  holder.appendChild(clone);
  document.body.appendChild(holder);

  let fontCSS = '';
  try {
    fontCSS = await withTimeout(embedFontsCSS(), 2500);
  } catch (e) {
    fontCSS = '';
  }

  const scale = 2;
  const W = Math.ceil(clone.offsetWidth || width);
  const H = Math.ceil(clone.offsetHeight);
  const xml = new XMLSerializer().serializeToString(clone);

  if (holder.parentNode) holder.parentNode.removeChild(holder);
  if (!H) throw new Error('empty height');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${W}px;background:${bgHex};">` +
    `<style>${fontCSS}${cssText}${captureCSS}</style>${xml}</div></foreignObject></svg>`;

  const img = new Image();
  await withTimeout(
    new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error('svg'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }),
    2500,
  );
  await new Promise((r) => setTimeout(r, 60)); // let embedded fonts settle before drawing

  const cnv = document.createElement('canvas');
  cnv.width = W * scale;
  cnv.height = H * scale;
  const cx = cnv.getContext('2d');
  cx.fillStyle = bgHex;
  cx.fillRect(0, 0, cnv.width, cnv.height);
  cx.setTransform(scale, 0, 0, scale, 0, 0);
  cx.drawImage(img, 0, 0, W, H);

  let pix;
  try {
    pix = cx.getImageData(0, 0, cnv.width, cnv.height).data;
  } catch (e) {
    throw new Error('tainted');
  }
  if (isUniform(pix)) throw new Error('blank');

  const breaks = findSafeBreaks(pix, cnv.width, cnv.height, bgRgb);
  const contentH = contentBottom(pix, cnv.width, cnv.height);
  return imagePDFBytes(cnv, breaks, contentH, pix, { hex: bgHex, unit: bgUnit });
}

// Wide bands of pure background (the theme's paper colour) are the only legal
// page-break rows.
function findSafeBreaks(data, W, H, bgRgb) {
  const x0 = Math.floor(W * 0.14),
    x1 = Math.floor(W * 0.92);
  const R = bgRgb[0],
    G = bgRgb[1],
    B = bgRgb[2],
    TOL = 7;
  const MIN_BAND = 50;
  const breaks = [];
  let runStart = -1;
  for (let y = 0; y <= H; y++) {
    let bg = 1;
    if (y < H) {
      const base = y * W * 4;
      let bad = 0;
      for (let x = x0; x < x1; x += 3) {
        const i = base + x * 4;
        if (
          Math.abs(data[i] - R) > TOL ||
          Math.abs(data[i + 1] - G) > TOL ||
          Math.abs(data[i + 2] - B) > TOL
        ) {
          if (++bad > 2) {
            bg = 0;
            break;
          }
        }
      }
    } else bg = 0;
    if (bg) {
      if (runStart < 0) runStart = y;
    } else {
      if (runStart >= 0 && y - runStart >= MIN_BAND) breaks.push(Math.floor((runStart + y) / 2));
      runStart = -1;
    }
  }
  return breaks;
}

function contentBottom(data, W, H) {
  const x0 = Math.floor(W * 0.05),
    x1 = Math.floor(W * 0.95);
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
  const x0 = Math.floor(W * 0.05),
    x1 = Math.floor(W * 0.95);
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
  const s = (safe || []).filter((b) => b > 0 && b < H).sort((a, b) => a - b);
  const bounds = [];
  let startY = 0,
    guard = 0;
  while (startY < H && guard++ < 200) {
    const ideal = startY + pageHpx;
    if (ideal >= H) {
      bounds.push(H);
      break;
    }
    let cut = -1;
    for (const b of s) {
      if (b > startY + 24 && b <= ideal) cut = b;
    }
    if (cut < 0) cut = ideal;
    bounds.push(cut);
    startY = cut;
  }
  if (bounds[bounds.length - 1] !== H) bounds.push(H);
  return bounds;
}

function imagePDFBytes(cnv, breaks, contentH, pix, bg) {
  const PW = 595.28,
    PH = 841.89,
    M = 0;
  const BG = bg.unit;
  const CWpt = PW - 2 * M,
    CHpt = PH - 2 * M;
  const Wpx = cnv.width;
  const Hpx = Math.min(contentH || cnv.height, cnv.height);
  const pxPerPt = Wpx / CWpt;
  const pageHpx = Math.max(1, Math.floor(CHpt * pxPerPt));

  const safe = (breaks || []).filter((b) => b > 0 && b < Hpx).sort((a, b) => a - b);
  const bounds = paginate(safe, Hpx, pageHpx);
  const cuts = [];
  let prev = 0;
  bounds.forEach((c) => {
    cuts.push([prev, c]);
    prev = c;
  });

  const slices = [];
  cuts.forEach(([sy, ey]) => {
    if (ey - sy < 2) return;
    if (pix && !rangeHasInk(pix, Wpx, sy, ey)) return;
    const sh = ey - sy;
    const tmp = document.createElement('canvas');
    tmp.width = Wpx;
    tmp.height = sh;
    const tctx = tmp.getContext('2d');
    tctx.fillStyle = bg.hex;
    tctx.fillRect(0, 0, Wpx, sh);
    tctx.drawImage(cnv, 0, sy, Wpx, sh, 0, 0, Wpx, sh);
    const bin = atob(tmp.toDataURL('image/jpeg', 0.92).split(',')[1]);
    slices.push({ bin, w: Wpx, h: sh, hpt: sh / pxPerPt });
  });
  if (!slices.length) {
    const sh = Hpx;
    const tmp = document.createElement('canvas');
    tmp.width = Wpx;
    tmp.height = sh;
    const tctx = tmp.getContext('2d');
    tctx.fillStyle = bg.hex;
    tctx.fillRect(0, 0, Wpx, sh);
    tctx.drawImage(cnv, 0, 0, Wpx, sh, 0, 0, Wpx, sh);
    slices.push({
      bin: atob(tmp.toDataURL('image/jpeg', 0.92).split(',')[1]),
      w: Wpx,
      h: sh,
      hpt: sh / pxPerPt,
    });
  }

  const objs = [];
  const add = (b) => {
    objs.push(b);
    return objs.length;
  };
  slices.forEach((s) =>
    add(
      `<< /Type /XObject /Subtype /Image /Width ${s.w} /Height ${s.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${s.bin.length} >>\nstream\n${s.bin}\nendstream`,
    ),
  );
  const firstContent = objs.length + 1;
  slices.forEach((s) => {
    const yB = (PH - M - s.hpt).toFixed(2);
    const c = `${BG} rg 0 0 ${PW.toFixed(2)} ${PH.toFixed(2)} re f q ${CWpt.toFixed(2)} 0 0 ${s.hpt.toFixed(2)} ${M.toFixed(2)} ${yB} cm /Im0 Do Q`;
    add(`<< /Length ${c.length} >>\nstream\n${c}\nendstream`);
  });
  const firstPage = objs.length + 1;
  const pagesNum = firstPage + slices.length;
  const catalogNum = pagesNum + 1;
  slices.forEach((s, i) =>
    add(
      `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 ${1 + i} 0 R >> >> /Contents ${firstContent + i} 0 R >>`,
    ),
  );
  add(
    `<< /Type /Pages /Count ${slices.length} /Kids [${slices.map((_, i) => `${firstPage + i} 0 R`).join(' ')}] >>`,
  );
  add(`<< /Type /Catalog /Pages ${pagesNum} 0 R >>`);

  let pdf = '%PDF-1.4\n%âãÏÓ\n';
  const offsets = [];
  objs.forEach((b, i) => {
    offsets[i] = pdf.length;
    pdf += `${i + 1} 0 obj\n${b}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => (pdf += String(o).padStart(10, '0') + ' 00000 n \n'));
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root ${catalogNum} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdfStringToBytes(pdf);
}
