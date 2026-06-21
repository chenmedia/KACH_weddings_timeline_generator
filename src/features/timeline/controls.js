import { PHASES } from '../../config.js';
import { FIELD_IDS, TOGGLE_IDS, NUMERIC_RANGES, validateState } from '../../lib/state.js';
import { el } from '../../ui/dom.js';

function textField(id, labelText, type, value, placeholder) {
  const input = el('input', { type, id, value: value || '' });
  if (placeholder) input.placeholder = placeholder;
  const wrap = el('div', { class: 'field' }, [el('label', { for: id, text: labelText }), input]);
  if (NUMERIC_RANGES[id]) {
    const r = NUMERIC_RANGES[id];
    input.min = r.min;
    input.max = r.max;
    wrap.appendChild(el('div', { class: 'field-error', id: id + '-err', 'aria-live': 'polite' }));
  }
  return wrap;
}

// Build the controls panel (form + actions + milestone editor).
// handlers: { onChange, onAction(name, button) }
export function buildControls(locale, state, handlers) {
  const c = locale.controls;
  const f = c.fields;

  const grid = el('div', { class: 'grid' }, [
    el('div', { class: 'field full' }, [
      el('label', { for: 'couple', text: f.couple.label }),
      Object.assign(el('input', { type: 'text', id: 'couple', value: state.couple || '' }), {
        placeholder: f.couple.ph,
      }),
    ]),
    textField('wdate', f.wdate.label, 'date', state.wdate),
    textField('bdate', f.bdate.label, 'date', state.bdate),
    textField('place', f.place.label, 'text', state.place, f.place.ph),
    textField('delw', f.delw.label, 'number', state.delw),
    el('div', { class: 'field full' }, el('div', { class: 'sub-label', text: c.subPayment })),
    textField('sendDays', f.sendDays.label, 'number', state.sendDays),
    textField('termDays', f.termDays.label, 'number', state.termDays),
    textField('finalOverride', f.finalOverride.label, 'date', state.finalOverride),
    el(
      'div',
      { class: 'field full' },
      el('div', { class: 'toggles' }, [
        el('label', { class: 'toggle' }, [
          checkbox('tEngage', state.tEngage),
          document.createTextNode(' ' + c.toggles.engage),
        ]),
        el('label', { class: 'toggle' }, [
          checkbox('tAlbum', state.tAlbum),
          document.createTextNode(' ' + c.toggles.album),
        ]),
      ]),
    ),
  ]);

  // ----- actions -----
  const mkBtn = (name, label, cls) => {
    const b = el('button', { class: cls, type: 'button', text: label });
    b.addEventListener('click', () => handlers.onAction(name, b));
    return b;
  };
  const customizeBtn = mkBtn('toggleEditor', c.buttons.customize, 'btn-ghost');
  // The timeline updates live, so there is no explicit "update" button.
  const actions = el('div', { class: 'actions' }, [
    mkBtn('share', c.buttons.share, 'btn-primary'),
    mkBtn('csv', c.buttons.csv, 'btn-ghost'),
    mkBtn('ics', c.buttons.ics, 'btn-ghost'),
    mkBtn('pdf', c.buttons.pdf, 'btn-ghost'),
    customizeBtn,
    mkBtn('reset', c.buttons.reset, 'btn-ghost'),
  ]);

  const editor = buildEditor(locale, state, handlers);

  const section = el('section', { class: 'controls no-print', 'aria-label': locale.controls.title }, [
    el('div', { class: 'controls-title', text: c.title }),
    grid,
    actions,
    editor,
  ]);

  // ----- wire field inputs -----
  // State updates immediately (so exports use the latest values); the re-render
  // and save are debounced so typing a name doesn't rebuild the timeline per key.
  const debouncedChange = debounce(handlers.onChange, 150);
  FIELD_IDS.forEach((id) => {
    const input = section.querySelector('#' + id);
    if (!input) return;
    input.addEventListener('input', () => {
      state[id] = input.value;
      debouncedChange();
    });
    if (NUMERIC_RANGES[id]) {
      input.addEventListener('change', () => {
        clampAndValidate(section, state, locale);
        handlers.onChange();
      });
    }
  });
  TOGGLE_IDS.forEach((id) => {
    const input = section.querySelector('#' + id);
    if (!input) return;
    input.addEventListener('change', () => {
      state[id] = input.checked;
      handlers.onChange();
    });
  });

  customizeBtn.addEventListener('click', () => {
    const hidden = editor.hasAttribute('hidden');
    if (hidden) editor.removeAttribute('hidden');
    else editor.setAttribute('hidden', '');
  });

  clampAndValidate(section, state, locale, /* silent */ true);
  return { el: section };
}

function checkbox(id, checked) {
  const cb = el('input', { type: 'checkbox', id });
  cb.checked = !!checked;
  return cb;
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function clampAndValidate(section, state, locale, silent) {
  const { state: clamped, warnings } = validateState(state, locale);
  const warnIds = new Set(warnings.map((w) => w.id));
  Object.keys(NUMERIC_RANGES).forEach((id) => {
    const input = section.querySelector('#' + id);
    const errEl = section.querySelector('#' + id + '-err');
    if (!input) return;
    // reflect clamped value back into the field and state
    if (!silent && input.value !== '' && input.value !== clamped[id]) input.value = clamped[id];
    state[id] = input.value === '' ? clamped[id] : input.value;
    const warn = warnings.find((w) => w.id === id);
    if (errEl) errEl.textContent = warn ? warn.message : '';
    input.setAttribute('aria-invalid', warnIds.has(id) ? 'true' : 'false');
  });
}

// ----- per-couple milestone editor -----
function buildEditor(locale, state, handlers) {
  const e = locale.editor;
  state.overrides = state.overrides || {};

  const wrap = el('div', { class: 'editor' });
  wrap.setAttribute('hidden', '');
  wrap.appendChild(el('div', { class: 'controls-title', text: e.title }));
  wrap.appendChild(el('div', { class: 'editor-intro', text: e.intro }));

  PHASES.forEach((phase) => {
    phase.items.forEach((it) => {
      const ov = state.overrides[it.key] || (state.overrides[it.key] = {});
      const content = locale.items[it.key] || {};

      const showCb = checkbox('show-' + it.key, !ov.hidden);
      const showLabel = el('label', { class: 'toggle' }, [showCb, document.createTextNode(' ' + e.show)]);

      const resetLink = el('button', { class: 'linkbtn', type: 'button', text: e.resetItem });

      const head = el('div', { class: 'ed-head' }, [
        el('span', { class: 'ed-title', text: content.title || it.key }),
        el('span', {}, [showLabel, document.createTextNode('  '), resetLink]),
      ]);

      const dateInput = el('input', { type: 'date', value: ov.date || '' });
      const noteArea = el('textarea', { rows: '2' });
      noteArea.value = ov.note || '';

      const row = el('div', { class: 'ed-row' }, [
        el('div', { class: 'field' }, [el('label', { text: e.customDate }), dateInput]),
        el('div', { class: 'field full' }, [el('label', { text: e.customNote }), noteArea]),
      ]);

      const item = el('div', { class: 'ed-item' + (ov.hidden ? ' is-hidden' : '') }, [head, row]);

      showCb.addEventListener('change', () => {
        ov.hidden = !showCb.checked;
        item.classList.toggle('is-hidden', ov.hidden);
        handlers.onChange();
      });
      dateInput.addEventListener('change', () => {
        ov.date = dateInput.value || undefined;
        handlers.onChange();
      });
      noteArea.addEventListener('input', () => {
        ov.note = noteArea.value.trim() || undefined;
        handlers.onChange();
      });
      resetLink.addEventListener('click', () => {
        delete state.overrides[it.key];
        state.overrides[it.key] = {};
        showCb.checked = true;
        dateInput.value = '';
        noteArea.value = '';
        item.classList.remove('is-hidden');
        handlers.onChange();
      });

      wrap.appendChild(item);
    });
  });

  return wrap;
}
