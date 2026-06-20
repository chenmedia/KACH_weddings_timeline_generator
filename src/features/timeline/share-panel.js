// Authenticated-only panel to enable/disable the couple's read-only link and
// copy it. Manages its own DOM; mutates the shared `state` (shareSlug/shareEnabled).
import { api } from '../../lib/api-client.js';
import { el } from '../../ui/dom.js';

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
    }
  }

  render();
  return wrap;
}
