// Authenticated fetch helpers for the photographer dashboard/editor.
// Public couple endpoint needs no auth.
import { getToken } from '../auth.js';

export class ApiError extends Error {
  /** @param {string} message @param {{status?:number, code?:string, payload?:any}} [opts] */
  constructor(message, opts = {}) {
    super(message);
    const { status, code, payload } = opts;
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

async function authed(url, opts = {}) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...opts, headers });
  const payload = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(payload?.error || `${opts.method || 'GET'} ${url} → ${res.status}`, {
      status: res.status,
      code: payload?.code,
      payload,
    });
  }
  return payload;
}

export const api = {
  list: () => authed('/api/timelines'),
  get: (id) => authed(`/api/timelines/${id}`),
  dashboard: () => authed('/api/weddings/dashboard'),
  workspace: (id, locale = 'nb') =>
    authed(`/api/weddings/${encodeURIComponent(id)}/workspace?locale=${encodeURIComponent(locale)}`),
  getJourney: (id) => authed(`/api/journeys/${encodeURIComponent(id)}`),
  updateJourney: (id, journey, expectedVersion) =>
    authed(`/api/journeys/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ journey, expectedVersion }),
    }),
  updateClientProfile: (id, profile, expectedVersion) =>
    authed(`/api/journeys/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ resource: 'client_profile', profile, expectedVersion }),
    }),
  importFocl: (id, payload) =>
    authed(`/api/journeys/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'focl_import', payload }),
    }),
  updateReview: (id, body) =>
    authed(`/api/journeys/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  create: (state) => authed('/api/timelines', { method: 'POST', body: JSON.stringify(state) }),
  update: (id, state) => authed(`/api/timelines/${id}`, { method: 'PUT', body: JSON.stringify(state) }),
  remove: (id) => authed(`/api/timelines/${id}`, { method: 'DELETE' }),
  setShare: (id, shareEnabled) =>
    authed(`/api/timelines/${id}`, { method: 'PATCH', body: JSON.stringify({ shareEnabled }) }),
  setShareExpiry: (id, shareExpiresAt) =>
    authed(`/api/timelines/${id}`, { method: 'PATCH', body: JSON.stringify({ shareExpiresAt }) }),
  revokeShare: (id) =>
    authed(`/api/timelines/${id}`, { method: 'PATCH', body: JSON.stringify({ rotateSlug: true }) }),
  publicGet: (slug) =>
    fetch(`/api/public/timeline/${encodeURIComponent(slug)}`).then((r) =>
      r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
    ),
  submitPublicReview: (slug, body) =>
    fetch(`/api/public/timeline/${encodeURIComponent(slug)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(async (r) => {
      const payload = await r.json().catch(() => null);
      if (!r.ok) throw new ApiError(payload?.error || String(r.status), { status: r.status, payload });
      return payload;
    }),
};
