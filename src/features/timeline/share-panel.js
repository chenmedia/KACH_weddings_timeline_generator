// Authenticated-only panel to manage the couple's read-only link: enable/disable,
// copy, QR, optional expiry, "last opened" signal, and revoke. Manages its own DOM;
// mutates the shared `state` (shareSlug/shareEnabled/shareExpiresAt/viewCount/lastViewedAt).
import { api } from '../../lib/api-client.js';
import { reportError } from '../../lib/observability.js';
import { el } from '../../ui/dom.js';
import { toast, confirmDialog } from '../../ui/feedback.js';
import { qrDataUrl } from '../../ui/qr.js';
import { isShareExpired, toDateInputValue, fromDateInputValue, formatViewed } from '../../lib/share.js';

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

      // Expiry control — optional date after which /c/:slug returns 410.
      const expiry = el('input', { type: 'date', class: 'share-expiry' });
      expiry.value = toDateInputValue(state.shareExpiresAt);
      const today = new Date();
      expiry.min = new Date(today.getTime() + 86400000).toISOString().slice(0, 10); // tomorrow
      expiry.addEventListener('change', async () => {
        expiry.disabled = true;
        const iso = fromDateInputValue(expiry.value);
        try {
          const r = await api.setShareExpiry(timelineId, iso);
          state.shareExpiresAt = r.shareExpiresAt;
          toast(iso ? s.expirySet : s.expiryCleared, { type: 'success' });
        } catch (e) {
          console.error('set expiry failed', e);
          reportError(e, { op: 'setShareExpiry' });
          toast(s.expiryFailed, { type: 'error' });
          expiry.value = toDateInputValue(state.shareExpiresAt);
        } finally {
          expiry.disabled = false;
          render();
        }
      });
      const expiryLabel = el('label', { class: 'share-expiry-row stack' }, [
        el('span', { class: 'editor-intro', text: s.expiryLabel }),
        expiry,
      ]);
      if (isShareExpired(state.shareExpiresAt)) {
        expiryLabel.appendChild(el('span', { class: 'share-expired-badge', text: s.expired }));
      }
      wrap.appendChild(expiryLabel);

      // "Last opened" signal + revoke.
      wrap.appendChild(
        el('div', {
          class: 'share-views editor-intro',
          text: formatViewed(state.lastViewedAt, state.viewCount, locale),
        }),
      );

      const revokeBtn = el('button', { class: 'btn-ghost', type: 'button', text: s.revoke });
      revokeBtn.addEventListener('click', async () => {
        const okToRevoke = await confirmDialog({
          title: s.revokeTitle,
          body: s.revokeConfirm,
          confirmLabel: s.revoke,
          cancelLabel: locale.feedback.cancel,
          danger: true,
        });
        if (!okToRevoke) return;
        try {
          const r = await api.revokeShare(timelineId);
          state.shareSlug = r.shareSlug;
          state.shareEnabled = r.shareEnabled;
          state.shareExpiresAt = r.shareExpiresAt;
          toast(s.revoked, { type: 'success' });
        } catch (e) {
          console.error('revoke failed', e);
          reportError(e, { op: 'revokeShare' });
          toast(s.revokeFailed, { type: 'error' });
        } finally {
          render();
        }
      });
      wrap.appendChild(el('div', { class: 'share-row cluster' }, [revokeBtn]));
    }
  }

  render();
  return wrap;
}
