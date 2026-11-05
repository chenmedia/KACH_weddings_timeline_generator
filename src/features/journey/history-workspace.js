import { el } from '../../ui/dom.js';

function formatTimestamp(value, locale) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat(locale.dateLocale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
}

export function buildHistoryWorkspace({ locale, activity, versions, milestones, onCreate, onRestore }) {
  const copy = locale.activity;
  const itemLabels = new Map((milestones?.rows || []).map((row) => [row.key, row.title]));
  const create = el('button', { type: 'button', class: 'btn-primary', text: copy.createVersion });
  create.addEventListener('click', onCreate);

  const feed = el('ol', { class: 'activity-feed' });
  activity.forEach((event) => {
    const actor = event.actorType === 'couple' ? event.actorName || copy.couple : copy.studio;
    const label = copy.actions[event.action] || event.action;
    const item = event.itemKey ? itemLabels.get(event.itemKey) : '';
    feed.appendChild(
      el('li', {}, [
        el('span', { class: `activity-dot is-${event.actorType || 'owner'}`, 'aria-hidden': 'true' }),
        el('div', {}, [
          el('p', {}, [el('strong', { text: actor }), document.createTextNode(` ${label}`)]),
          item ? el('span', { class: 'activity-context', text: item }) : null,
          el('time', { datetime: event.createdAt, text: formatTimestamp(event.createdAt, locale) }),
        ]),
      ]),
    );
  });

  const versionList = el('div', { class: 'version-list' });
  versions.forEach((version, index) => {
    const restore = el('button', { type: 'button', class: 'btn-ghost', text: copy.restore });
    restore.addEventListener('click', () => onRestore(version));
    versionList.appendChild(
      el('article', {}, [
        el('div', {}, [
          el('span', {
            class: 'version-number',
            text: index === 0 ? copy.latestVersion : copy.version(version.sequence),
          }),
          el('h3', { text: copy.sources[version.source] || version.summary || copy.automaticVersion }),
          version.summary ? el('p', { text: version.summary }) : null,
          el('time', {
            datetime: version.createdAt,
            text: formatTimestamp(version.createdAt, locale),
          }),
        ]),
        restore,
      ]),
    );
  });

  return el('section', { class: 'history-workspace' }, [
    el('header', { class: 'journey-embedded-heading history-heading' }, [
      el('div', {}, [
        el('p', { class: 'journey-studio-kicker', text: copy.kicker }),
        el('h2', { text: copy.title }),
        el('p', { text: copy.intro }),
      ]),
      create,
    ]),
    el('div', { class: 'history-layout' }, [
      el('section', { class: 'activity-column' }, [
        el('h3', { text: copy.activityTitle }),
        activity.length ? feed : el('p', { class: 'history-empty', text: copy.noActivity }),
      ]),
      el('aside', { class: 'version-column' }, [
        el('h3', { text: copy.versionTitle }),
        versions.length ? versionList : el('p', { class: 'history-empty', text: copy.noVersions }),
      ]),
    ]),
  ]);
}
