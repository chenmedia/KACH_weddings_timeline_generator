// Photographer dashboard: lists the signed-in user's timelines with create,
// select and delete. Presentational — all data ops go through the handlers.
import { api } from '../lib/api-client.js';
import { fmtDate, parseISO } from '../lib/dates.js';

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return n;
}

/**
 * @param {object} locale
 * @param {{ onSelect:(id:string)=>void, onNew:()=>void, onDelete:(id:string)=>void,
 *           mountUserButton:(el:HTMLElement)=>void }} handlers
 */
export function buildDashboard(locale, handlers) {
  const d = locale.dashboard;
  const list = el('div', { class: 'dash-list' });
  const userBtn = el('div', { class: 'dash-user' });

  const newBtn = el('button', { class: 'btn-primary', type: 'button', text: d.newBtn });
  newBtn.addEventListener('click', () => handlers.onNew());

  const head = el('div', { class: 'dash-head' }, [
    el('div', { class: 'controls-title', text: d.title }),
    el('div', { class: 'dash-actions' }, [newBtn, userBtn]),
  ]);

  const wrap = el('section', { class: 'dashboard no-print' }, [head, list]);
  handlers.mountUserButton(userBtn);

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
        const dateStr = tl.wdate ? fmtDate(parseISO(tl.wdate), locale.dateLocale) : '—';
        const open = el(
          'button',
          {
            class: 'dash-item' + (tl.id === activeId ? ' is-active' : ''),
            type: 'button',
          },
          [
            el('span', { class: 'dash-couple', text: tl.couple || locale.timeline.defaultCouple }),
            el('span', { class: 'dash-meta', text: `${dateStr} · ${tl.status || ''}` }),
          ],
        );
        open.addEventListener('click', () => handlers.onSelect(tl.id));

        const del = el('button', { class: 'linkbtn', type: 'button', text: d.delete });
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(d.deleteConfirm)) handlers.onDelete(tl.id);
        });

        list.appendChild(el('div', { class: 'dash-row' }, [open, del]));
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
