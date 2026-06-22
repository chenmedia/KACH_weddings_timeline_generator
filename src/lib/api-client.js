// Authenticated fetch helpers for the photographer dashboard/editor.
// Public couple endpoint needs no auth.
import { getToken } from '../auth.js';

async function authed(url, opts = {}) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${url} → ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export const api = {
  list: () => authed('/api/timelines'),
  get: (id) => authed(`/api/timelines/${id}`),
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
};
