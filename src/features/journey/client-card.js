import { el } from '../../ui/dom.js';
import { toast } from '../../ui/feedback.js';

function field({ label, value = '', type = 'text', placeholder = '', onInput }) {
  const input = el('input', { type, value, ...(placeholder ? { placeholder } : {}) });
  input.addEventListener('input', () => onInput(input.value));
  return el('label', { class: 'client-card-field' }, [el('span', { text: label }), input]);
}

function contactFields(copy, contact, onChange, { role = true } = {}) {
  return el('div', { class: 'client-contact-fields' }, [
    field({ label: copy.name, value: contact.name, onInput: (value) => onChange('name', value) }),
    role
      ? field({ label: copy.role, value: contact.role, onInput: (value) => onChange('role', value) })
      : null,
    field({
      label: copy.email,
      value: contact.email,
      type: 'email',
      onInput: (value) => onChange('email', value),
    }),
    field({
      label: copy.phone,
      value: contact.phone,
      type: 'tel',
      onInput: (value) => onChange('phone', value),
    }),
    field({
      label: copy.instagram,
      value: contact.instagram,
      onInput: (value) => onChange('instagram', value),
    }),
  ]);
}

function listSection({ title, empty, items, renderItem, addLabel }) {
  return el('section', { class: 'client-list-section' }, [
    el('div', { class: 'client-section-line' }, [
      el('h3', { text: title }),
      el('button', { type: 'button', class: 'btn-ghost', text: addLabel }),
    ]),
    items.length ? el('div', { class: 'client-list-grid' }, items.map(renderItem)) : el('p', { text: empty }),
  ]);
}

function buildFoclPrompt(foclUrl) {
  return `Use my connected FOCL account and export the wedding${foclUrl ? ` at ${foclUrl}` : ''}. Return ONLY valid JSON with this exact shape:
{"foclWeddingId":"","foclUrl":"","wedding":{"couple":"","weddingDate":"YYYY-MM-DD","bookingDate":"YYYY-MM-DD","venue":""},"clients":[{"name":"","email":"","phone":"","instagram":""}],"planner":{"name":"","email":"","phone":"","company":""},"contacts":[],"locations":[{"name":"","type":"","address":"","notes":""}],"vendors":[{"name":"","type":"","email":"","phone":"","website":""}],"familyGroups":[{"label":"","people":[]}],"timeline":[{"id":"","title":"","startTime":"","endTime":"","location":"","notes":""}],"notes":""}
Use empty strings or empty arrays when FOCL has no value. Do not add markdown.`;
}

export function buildClientCard({ locale, workspace, onProfileChange, onJourneyChange, onImport }) {
  const copy = locale.clientCard;
  const profile = workspace.profile.data;
  const importArea = el('div', { class: 'focl-import-area', hidden: '' });
  const payload = el('textarea', {
    rows: '8',
    placeholder: copy.pastePlaceholder,
    'aria-label': copy.pastePlaceholder,
  });
  const importButton = el('button', { type: 'button', class: 'btn-primary', text: copy.importButton });
  importButton.addEventListener('click', async () => {
    try {
      const parsed = JSON.parse(payload.value);
      importButton.disabled = true;
      importButton.textContent = copy.importing;
      await onImport(parsed);
    } catch (error) {
      importButton.disabled = false;
      importButton.textContent = copy.importButton;
      toast(error instanceof SyntaxError ? copy.invalidJson : copy.importFailed, { type: 'error' });
    }
  });
  importArea.append(payload, importButton);

  const copyPrompt = el('button', { type: 'button', class: 'btn-ghost', text: copy.copyPrompt });
  copyPrompt.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(buildFoclPrompt(workspace.journey.foclUrl));
      toast(copy.promptCopied, { type: 'success' });
    } catch {
      toast(copy.importFailed, { type: 'error' });
    }
  });
  const openImport = el('button', { type: 'button', class: 'btn-primary', text: copy.pasteData });
  openImport.addEventListener('click', () => {
    importArea.hidden = !importArea.hidden;
    if (!importArea.hidden) payload.focus();
  });
  const foclUrl = field({
    label: copy.foclUrl,
    value: workspace.journey.foclUrl,
    type: 'url',
    placeholder: 'https://…',
    onInput: (value) => {
      workspace.journey.foclUrl = value.trim();
      onJourneyChange();
    },
  });

  const partners = el('div', { class: 'client-partners' });
  profile.partners.forEach((partner, index) => {
    partners.appendChild(
      el('article', { class: 'client-contact-card' }, [
        el('p', { class: 'journey-studio-kicker', text: `${copy.partner} ${index + 1}` }),
        contactFields(
          copy,
          partner,
          (key, value) => {
            partner[key] = value;
            onProfileChange();
          },
          { role: false },
        ),
      ]),
    );
  });
  if (profile.partners.length < 2) {
    const addPartner = el('button', { type: 'button', class: 'client-add-card', text: copy.addPartner });
    addPartner.addEventListener('click', () => {
      profile.partners.push({ name: '', role: 'partner', email: '', phone: '', instagram: '' });
      onProfileChange(true);
    });
    partners.appendChild(addPartner);
  }

  const locations = listSection({
    title: copy.locations,
    empty: copy.noLocations,
    items: profile.locations,
    addLabel: copy.add,
    renderItem: (location, index) =>
      el('article', { class: 'client-list-card' }, [
        field({
          label: copy.locationName,
          value: location.name,
          onInput: (value) => {
            location.name = value;
            onProfileChange();
          },
        }),
        field({
          label: copy.address,
          value: location.address,
          onInput: (value) => {
            location.address = value;
            onProfileChange();
          },
        }),
        el('button', {
          type: 'button',
          class: 'client-remove',
          text: copy.remove,
          'data-location-index': String(index),
        }),
      ]),
  });
  locations.querySelector('.client-section-line button').addEventListener('click', () => {
    profile.locations.push({ name: '', type: '', address: '', notes: '' });
    onProfileChange(true);
  });
  locations.querySelectorAll('[data-location-index]').forEach((button) => {
    button.addEventListener('click', () => {
      profile.locations.splice(Number(button.dataset.locationIndex), 1);
      onProfileChange(true);
    });
  });

  const vendors = listSection({
    title: copy.vendors,
    empty: copy.noVendors,
    items: profile.vendors,
    addLabel: copy.add,
    renderItem: (vendor, index) =>
      el('article', { class: 'client-list-card' }, [
        contactFields(copy, vendor, (key, value) => {
          vendor[key] = value;
          onProfileChange();
        }),
        field({
          label: copy.website,
          value: vendor.website,
          type: 'url',
          onInput: (value) => {
            vendor.website = value;
            onProfileChange();
          },
        }),
        el('button', {
          type: 'button',
          class: 'client-remove',
          text: copy.remove,
          'data-vendor-index': String(index),
        }),
      ]),
  });
  vendors.querySelector('.client-section-line button').addEventListener('click', () => {
    profile.vendors.push({ name: '', role: '', email: '', phone: '', instagram: '', website: '' });
    onProfileChange(true);
  });
  vendors.querySelectorAll('[data-vendor-index]').forEach((button) => {
    button.addEventListener('click', () => {
      profile.vendors.splice(Number(button.dataset.vendorIndex), 1);
      onProfileChange(true);
    });
  });

  const contacts = listSection({
    title: copy.contacts,
    empty: copy.noContacts,
    items: profile.contacts,
    addLabel: copy.add,
    renderItem: (contact, index) =>
      el('article', { class: 'client-list-card' }, [
        contactFields(copy, contact, (key, value) => {
          contact[key] = value;
          onProfileChange();
        }),
        el('button', {
          type: 'button',
          class: 'client-remove',
          text: copy.remove,
          'data-contact-index': String(index),
        }),
      ]),
  });
  contacts.querySelector('.client-section-line button').addEventListener('click', () => {
    profile.contacts.push({ name: '', role: '', email: '', phone: '', instagram: '' });
    onProfileChange(true);
  });
  contacts.querySelectorAll('[data-contact-index]').forEach((button) => {
    button.addEventListener('click', () => {
      profile.contacts.splice(Number(button.dataset.contactIndex), 1);
      onProfileChange(true);
    });
  });

  const familyGroups = listSection({
    title: copy.familyGroups,
    empty: copy.noFamilyGroups,
    items: profile.familyGroups,
    addLabel: copy.add,
    renderItem: (group, index) => {
      const people = el('textarea', { rows: '3', 'aria-label': copy.people });
      people.value = group.people.join(', ');
      people.addEventListener('input', () => {
        group.people = people.value
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean);
        onProfileChange();
      });
      return el('article', { class: 'client-list-card' }, [
        field({
          label: copy.groupName,
          value: group.label,
          onInput: (value) => {
            group.label = value;
            onProfileChange();
          },
        }),
        el('label', { class: 'client-card-field' }, [el('span', { text: copy.people }), people]),
        el('button', {
          type: 'button',
          class: 'client-remove',
          text: copy.remove,
          'data-family-index': String(index),
        }),
      ]);
    },
  });
  familyGroups.querySelector('.client-section-line button').addEventListener('click', () => {
    profile.familyGroups.push({ label: '', people: [] });
    onProfileChange(true);
  });
  familyGroups.querySelectorAll('[data-family-index]').forEach((button) => {
    button.addEventListener('click', () => {
      profile.familyGroups.splice(Number(button.dataset.familyIndex), 1);
      onProfileChange(true);
    });
  });

  const notes = el('textarea', { rows: '6', maxlength: '4000', 'aria-label': copy.notes });
  notes.value = profile.notes;
  notes.addEventListener('input', () => {
    profile.notes = notes.value;
    onProfileChange();
  });

  const foclTimeline = el('ol', { class: 'focl-day-timeline' });
  profile.foclTimeline.forEach((item) => {
    foclTimeline.appendChild(
      el('li', {}, [
        el('time', { text: [item.startTime, item.endTime].filter(Boolean).join('-') || '-' }),
        el('div', {}, [
          el('strong', { text: item.title }),
          item.location ? el('span', { text: item.location }) : null,
          item.notes ? el('p', { text: item.notes }) : null,
        ]),
      ]),
    );
  });

  return el('div', { class: 'client-card-workspace' }, [
    el('section', { class: 'focl-sync-card' }, [
      el('div', {}, [
        el('p', { class: 'journey-studio-kicker', text: copy.foclKicker }),
        el('h2', { text: copy.foclTitle }),
        el('p', { text: copy.foclIntro }),
      ]),
      el('div', { class: 'focl-sync-status' }, [
        el('span', { text: copy.syncStatus[workspace.profile.syncStatus] || copy.syncStatus.not_connected }),
        workspace.profile.lastSyncedAt
          ? el('small', {
              text: `${copy.lastSynced} ${new Date(workspace.profile.lastSyncedAt).toLocaleString(locale.dateLocale)}`,
            })
          : null,
      ]),
      foclUrl,
      el('div', { class: 'focl-sync-actions' }, [copyPrompt, openImport]),
      importArea,
    ]),
    el('section', { class: 'client-card-section' }, [
      el('div', { class: 'journey-section-heading' }, [
        el('h2', { text: copy.peopleTitle }),
        el('p', { text: copy.peopleIntro }),
      ]),
      partners,
      el('article', { class: 'client-contact-card client-planner-card' }, [
        el('p', { class: 'journey-studio-kicker', text: copy.planner }),
        contactFields(copy, profile.planner, (key, value) => {
          profile.planner[key] = value;
          onProfileChange();
        }),
      ]),
    ]),
    contacts,
    locations,
    vendors,
    familyGroups,
    el('section', { class: 'client-list-section' }, [el('h3', { text: copy.notes }), notes]),
    el('section', { class: 'client-list-section' }, [
      el('div', { class: 'client-section-line' }, [
        el('h3', { text: copy.foclTimeline }),
        el('span', { text: String(profile.foclTimeline.length) }),
      ]),
      profile.foclTimeline.length ? foclTimeline : el('p', { text: copy.noFoclTimeline }),
    ]),
  ]);
}
