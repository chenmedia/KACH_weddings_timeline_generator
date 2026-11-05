const MAX = {
  short: 160,
  note: 4000,
  list: 40,
  timeline: 80,
};

function text(value, max = MAX.short) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function url(value) {
  const valueText = text(value, 600);
  if (!valueText) return '';
  try {
    const parsed = new URL(valueText);
    return parsed.protocol === 'https:' ? parsed.toString() : '';
  } catch {
    return '';
  }
}

function list(value, mapper, max = MAX.list) {
  return Array.isArray(value) ? value.slice(0, max).map(mapper).filter(Boolean) : [];
}

function record(value) {
  return /** @type {Record<string, any>} */ (value && typeof value === 'object' ? value : {});
}

function contact(value = {}) {
  if (!value || typeof value !== 'object') return null;
  value = record(value);
  const result = {
    name: text(value.name || value.fullName),
    role: text(value.role || value.type || value.relationship),
    email: text(value.email, 254),
    phone: text(value.phone || value.mobile, 50),
    instagram: text(value.instagram || value.social, 100),
  };
  return Object.values(result).some(Boolean) ? result : null;
}

export function defaultClientProfile() {
  return {
    partners: [contact({}) || { name: '', role: 'partner', email: '', phone: '', instagram: '' }],
    planner: { name: '', role: 'planner', email: '', phone: '', instagram: '' },
    contacts: [],
    locations: [],
    vendors: [],
    familyGroups: [],
    foclTimeline: [],
    notes: '',
  };
}

export function sanitizeClientProfile(input = {}) {
  const source = record(input);
  const partners = list(source.partners, contact, 2);
  return {
    partners: partners.length ? partners : defaultClientProfile().partners,
    planner: contact(source.planner) || defaultClientProfile().planner,
    contacts: list(source.contacts, contact),
    locations: list(source.locations, (item) => {
      if (!item || typeof item !== 'object') return null;
      item = record(item);
      const result = {
        name: text(item.name),
        type: text(item.type),
        address: text(item.address, 500),
        notes: text(item.notes, 1000),
      };
      return Object.values(result).some(Boolean) ? result : null;
    }),
    vendors: list(source.vendors, (item) => {
      item = record(item);
      const result = contact(item);
      if (!result) return null;
      return { ...result, website: url(item.website || item.url) };
    }),
    familyGroups: list(source.familyGroups, (item) => {
      if (!item || typeof item !== 'object') return null;
      item = record(item);
      const label = text(item.label || item.name);
      const people = list(item.people, (person) => text(person), 30);
      return label || people.length ? { label, people } : null;
    }),
    foclTimeline: list(
      source.foclTimeline || source.timeline,
      (item, index) => {
        if (!item || typeof item !== 'object') return null;
        item = record(item);
        const title = text(item.title || item.name);
        if (!title) return null;
        return {
          id: text(item.id || `focl-${index}`),
          title,
          startTime: text(item.startTime || item.start || item.time, 40),
          endTime: text(item.endTime || item.end, 40),
          location: text(item.location || item.place),
          notes: text(item.notes || item.description, 1000),
        };
      },
      MAX.timeline,
    ),
    notes: text(source.notes, MAX.note),
  };
}

// Stable import contract for data returned by the user's connected FOCL ChatGPT
// integration. A future direct FOCL API can send the same payload unchanged.
export function normalizeFoclImport(input = {}) {
  const root = record(input);
  const wedding = record(root.wedding || root);
  const clients = root.clients || wedding.clients || root.partners || wedding.partners || [];
  const profile = sanitizeClientProfile({
    partners: clients,
    planner: root.planner || wedding.planner,
    contacts: root.contacts || wedding.contacts,
    locations: root.locations || wedding.locations,
    vendors: root.vendors || wedding.vendors,
    familyGroups: root.familyGroups || root.familyPhotos || wedding.familyGroups,
    foclTimeline: root.timeline || wedding.timeline,
    notes: root.notes || wedding.notes,
  });
  const names = profile.partners.map((partner) => partner.name).filter(Boolean);
  return {
    sourceId: text(root.foclWeddingId || root.id || wedding.id, 200),
    sourceUrl: url(root.foclUrl || root.url || wedding.url),
    profile,
    project: {
      couple: text(wedding.couple || wedding.coupleName || names.join(' & ')),
      wdate: text(wedding.weddingDate || wedding.date, 10),
      bdate: text(wedding.bookingDate || wedding.contractDate, 10),
      place: text(wedding.venue || wedding.place || profile.locations[0]?.name),
    },
  };
}
