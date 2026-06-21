// Authenticated-only panel to enable/disable the couple's read-only link and
// copy it. Manages its own DOM; mutates the shared `state` (shareSlug/shareEnabled).
import { api } from '../../lib/api-client.js';
import { reportError } from '../../lib/observability.js';
import { el } from '../../ui/dom.js';
import { toast } from '../../ui/feedback.js';
import { qrDataUrl } from '../../ui/qr.js';

/**
 * @param {object} locale
 * @param {{ timelineId: string, state: any }} ctx — `state` carries shareSlug/shareEnabled
 */
export function buildSharePanel(locale, { timelineId, state }) {
  const s = locale.share;
  const wrap = el('section', { class: 'share-panel no-print' });
  const shareUrl = () => `${location.origin}/c/${state.shareSlug}`;

  function render() {
    wrap.innerHTML = '';
    wrap.appendChild(el('div', { class: 'controls-title', text: s.title }));

    const cb = el('input', { type: 'checkbox' });
    cb.checked = !!state.shareEnabled;
    cb.addEventListener('change', async () => {
      cb.disabled = true;
      try {
        const r = await api.setShare(timelineId, cb.checked);
        state.shareEnabled = r.shareEnabled;
        state.shareSlug = r.shareSlug;
      } catch (e) {
        console.error('share toggle failed', e);
        reportError(e, { op: 'setShare' });
        toast(locale.feedback.shareToggleFailed, { type: 'error' });
        cb.checked = !cb.checked;
      } finally {
        cb.disabled = false;
        render();
      }
    });
    wrap.appendChild(el('label', { class: 'toggle' }, [cb, document.createTextNode(' ' + s.enable)]));
    wrap.appendChild(el('div', { class: 'editor-intro', text: s.hint }));

    if (state.shareEnabled && state.shareSlug) {
      const input = el('input', { type: 'text', readonly: 'readonly', class: 'share-url' });
      input.value = shareUrl();
      input.addEventListener('focus', () => input.select());

      const status = el('span', { class: 'toast', role: 'status', 'aria-live': 'polite' });
      const copyBtn = el('button', { class: 'btn-ghost', type: 'button', text: s.copy });
      copyBtn.addEventListener('click', async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareUrl());
          } else {
            input.select();
            document.execCommand('copy');
          }
          status.textContent = s.copied;
        } catch {
          status.textContent = s.failed;
        }
        status.classList.add('show');
        setTimeout(() => status.classList.remove('show'), 2600);
      });

      wrap.appendChild(el('div', { class: 'share-row cluster' }, [input, copyBtn, status]));

      // QR code so the couple can open the link from a phone the photographer
      // is holding. Rendered async; silently omitted if generation fails.
      const qrImg = el('img', { class: 'share-qr', alt: s.scan, width: '120', height: '120' });
      const qrFig = el('figure', { class: 'share-qr-fig' }, [
        qrImg,
        el('figcaption', { class: 'editor-intro', text: s.scan }),
      ]);
      wrap.appendChild(qrFig);
      qrDataUrl(shareUrl())
        .then((url) => {
          qrImg.src = url;
        })
        .catch((e) => {
          console.warn('QR generation failed', e);
          qrFig.remove();
        });
    }
  }

  render();
  return wrap;
}
