import { track } from '../../analytics.js';
import { defaultState } from '../../lib/state.js';
import { el } from '../../ui/dom.js';
import { buildControls } from '../timeline/controls.js';
import { renderTimeline } from '../timeline/render.js';
import { buildSharePanel } from '../timeline/share-panel.js';

export function buildTimelineWorkspace({ locale, state, onChange, onReset, onOpenSharing }) {
  const preview = el('section', {
    id: 'output',
    class: 'journey-timeline-preview',
    'aria-label': locale.tools.timeline.title,
  });
  const renderPreview = () => renderTimeline(state, locale, preview);

  const onAction = async (name, button) => {
    switch (name) {
      case 'share':
        onOpenSharing();
        break;
      case 'csv': {
        const { downloadCSV } = await import('../../exporters/csv.js');
        downloadCSV(state, locale);
        track('Export CSV', { surface: 'client-workspace' });
        break;
      }
      case 'ics': {
        const { downloadICS } = await import('../../exporters/ics.js');
        downloadICS(state, locale);
        track('Export ICS', { surface: 'client-workspace' });
        break;
      }
      case 'pdf': {
        const { exportPDF } = await import('../../exporters/pdf/index.js');
        exportPDF(state, locale, { refresh: renderPreview, button });
        track('Export PDF', { surface: 'client-workspace' });
        break;
      }
      case 'reset':
        onReset(defaultState());
        break;
      case 'toggleEditor':
      default:
        break;
    }
  };

  const controls = buildControls(locale, state, {
    onChange: () => {
      onChange();
      renderPreview();
    },
    onAction,
  }).el;
  renderPreview();

  return el('section', { class: 'journey-timeline-workspace' }, [
    el('header', { class: 'journey-embedded-heading' }, [
      el('p', { class: 'journey-studio-kicker', text: locale.journey.timelineWorkspace.kicker }),
      el('h2', { text: locale.journey.timelineWorkspace.title }),
      el('p', { text: locale.journey.timelineWorkspace.intro }),
    ]),
    el('div', { class: 'journey-timeline-layout' }, [controls, preview]),
  ]);
}

export function buildSharingWorkspace({ locale, timelineId, state }) {
  return el('section', { class: 'journey-sharing-workspace' }, [
    el('header', { class: 'journey-embedded-heading' }, [
      el('p', { class: 'journey-studio-kicker', text: locale.journey.sharingWorkspace.kicker }),
      el('h2', { text: locale.journey.sharingWorkspace.title }),
      el('p', { text: locale.journey.sharingWorkspace.intro }),
    ]),
    buildSharePanel(locale, { timelineId, state }),
  ]);
}
