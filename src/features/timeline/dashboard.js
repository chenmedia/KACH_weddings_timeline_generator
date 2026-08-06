// Photographer dashboard: lists the signed-in user's timelines with create,
// select and delete. Presentational — all data ops go through the handlers.
import { api } from '../../lib/api-client.js';
import { fmtDate, parseISO } from '../../lib/dates.js';
import { el } from '../../ui/dom.js';
import { confirmDialog } from '../../ui/feedback.js';
import { t } from '../../i18n.js';

/**
 * @param {object} locale
 * @param {{ onSelect:(id:string)=>void, onNew:()=>void, onDelete:(id:string)=>void,
 *           mountUserButton:(el:HTMLElement)=>void }} handlers
 */
export function buildDashboard(locale, handlers) {
  const d = locale.dashboard;
  const list = el('ul', { class: 'dash-list', role: 'list' });

  const newBtn = el('button', { class: 'btn-primary', type: 'button', text: d.newBtn });
  newBtn.addEventListener('click', () => handlers.onNew());

  // Account moved to the sidebar foot (see shell.js); the dashboard header now
  // carries just the title + primary "new couple" action.
  const head = el('div', { class: 'dash-head' }, [
    el('div', { class: 'controls-title', text: d.title }),
    el('div', { class: 'dash-actions' }, [newBtn]),
  ]);

  const wrap = el('section', { class: 'dashboard no-print' }, [head, list]);

  let activeId = null;

  async function refresh() {
    list.innerHTML = '';
    list.appendChild(el('div', { class: 'dash-empty', text: d.loading }));
    try {
      const { timelines } = await api.list();
      list.innerHTML = '';
      if (!timelines.length) {
        list.appendChild(el('div', { class: 'dash-empty', text: d.empty }));
        return;
      }
      timelines.forEach((tl) => {
        const coupleName = tl.couple || locale.timeline.defaultCouple;
        const dateStr = tl.wdate ? fmtDate(parseISO(tl.wdate), locale.dateLocale) : '—';
        const open = el(
          'button',
          {
            class: 'dash-item' + (tl.id === activeId ? ' is-active' : ''),
            type: 'button',
            'aria-current': tl.id === activeId ? 'true' : 'false',
          },
          [
            el('span', { class: 'dash-couple', text: coupleName }),
            el('span', { class: 'dash-meta', text: `${dateStr} · ${tl.status || ''}` }),
          ],
        );
        open.addEventListener('click', () => handlers.onSelect(tl.id));

        // Accessible name disambiguates the per-row delete for screen readers.
        const del = el('button', {
          class: 'linkbtn dash-delete',
          type: 'button',
          text: d.delete,
          'aria-label': `${d.delete} – ${coupleName}`,
        });
        del.addEventListener('click', async (e) => {
          e.stopPropagation();
          const ok = await confirmDialog({
            title: t().feedback.deleteTitle,
            body: d.deleteConfirm,
            confirmLabel: d.delete,
            cancelLabel: t().feedback.cancel,
            danger: true,
          });
          if (ok) handlers.onDelete(tl.id);
        });

        list.appendChild(el('li', { class: 'dash-row' }, [open, del]));
      });
    } catch {
      list.innerHTML = '';
      list.appendChild(el('div', { class: 'dash-empty', text: d.error }));
    }
  }

  function setActive(id) {
    activeId = id;
  }

  return { el: wrap, refresh, setActive };
}
