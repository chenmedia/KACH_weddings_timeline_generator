// PDF export entry point. Tries the pixel-identical raster path first, then
// falls back to the vector drawing if the browser can't rasterise.
import { getMilestones } from '../../lib/milestones.js';
import { slug } from '../../lib/download.js';
import { withTimeout } from './util.js';
import { rasterPDFBytes } from './raster.js';
import { vectorPDFBytes } from './vector.js';
import { showPdfOverlay } from './overlay.js';
import { toast } from '../../ui/feedback.js';

export async function exportPDF(state, locale, opts = {}) {
  const { refresh, button } = opts;
  const data = getMilestones(state, locale);
  if (!data) {
    toast(locale.alerts.pickDate, { type: 'error' });
    return;
  }
  const couple = (state.couple || '').trim();
  const prevLabel = button ? button.textContent : '';
  if (button) {
    button.disabled = true;
    button.textContent = locale.pdf.exporting;
  }
  let bytes = null;
  try {
    bytes = await withTimeout(rasterPDFBytes(refresh), 4000);
  } catch (e) {
    bytes = null;
  }
  if (!bytes) {
    try {
      bytes = vectorPDFBytes(state, locale);
    } catch (e) {
      bytes = null;
    }
  }
  if (button) {
    button.disabled = false;
    button.textContent = prevLabel;
  }
  if (!bytes) {
    toast(locale.pdf.error, { type: 'error' });
    return;
  }
  deliverPDF(bytes, couple, locale);
  toast(locale.feedback.exported, { type: 'success' });
}

function deliverPDF(bytes, couple, locale) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const fname = `kach-weddings-tidslinje-${slug(couple)}.pdf`;
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    /* download may be blocked in the sandbox */
  }
  showPdfOverlay(url, fname, locale);
}
