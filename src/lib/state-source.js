// Pluggable persistence seam. The app talks to a "state source" instead of
// localStorage directly, so we can swap in the backend without touching the UI.
//
// - LocalStorageSource: current behaviour (anonymous / logged-out use).
// - ApiSource: talks to /api (Phase 1 backend). Inert until the app is wired to
//   it and Clerk/Neon env is configured.
//
// NOTE: main.js is not rewired yet — that is the first integration step of
// Phase 1. This module exists so that switch is a one-line change.
import { loadState, saveState, clearState } from './state.js';

/** @typedef {{ load: () => Promise<any>, save: (s:any)=>Promise<void>, clear: ()=>Promise<void> }} StateSource */

/** localStorage-backed source — wraps the existing (sync) state.js helpers. */
export class LocalStorageSource {
  async load() {
    return loadState();
  }
  async save(state) {
    saveState(state);
  }
  async clear() {
    clearState();
  }
}

/** Backend-backed source. Reads/writes timelines through /api (Clerk-authed). */
export class ApiSource {
  /** @param {{ baseUrl?: string, getToken?: () => Promise<string|undefined> }} [opts] */
  constructor(opts = {}) {
    this.baseUrl = opts.baseUrl || '/api';
    this.getToken = opts.getToken || (async () => undefined);
    /** @type {string|undefined} current timeline id */
    this.timelineId = undefined;
  }

  async _headers() {
    const token = await this.getToken();
    const h = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  async load() {
    if (!this.timelineId) return null;
    const res = await fetch(`${this.baseUrl}/timelines/${this.timelineId}`, {
      headers: await this._headers(),
    });
    if (!res.ok) return null;
    return res.json();
  }

  async save(state) {
    const method = this.timelineId ? 'PUT' : 'POST';
    const url = this.timelineId
      ? `${this.baseUrl}/timelines/${this.timelineId}`
      : `${this.baseUrl}/timelines`;
    const res = await fetch(url, {
      method,
      headers: await this._headers(),
      body: JSON.stringify(state),
    });
    if (!res.ok) throw new Error(`save failed: ${res.status}`);
    const row = await res.json();
    if (row && row.id) this.timelineId = row.id;
    return row;
  }

  async clear() {
    if (!this.timelineId) return;
    await fetch(`${this.baseUrl}/timelines/${this.timelineId}`, {
      method: 'DELETE',
      headers: await this._headers(),
    });
    this.timelineId = undefined;
  }
}

/**
 * Pick a source. Defaults to localStorage; the backend is opt-in so the app
 * keeps working exactly as today until Phase 1 is wired up + env is set.
 * @param {{ apiEnabled?: boolean, api?: { baseUrl?: string, getToken?: () => Promise<string|undefined> } }} [opts]
 * @returns {StateSource}
 */
export function createStateSource(opts = {}) {
  return opts.apiEnabled ? new ApiSource(opts.api) : new LocalStorageSource();
}

/**
 * Generic REST resource client over /api/<name>. Lets future features
 * (templates, payments, …) get list/get/create/update/remove without
 * reimplementing fetch + Clerk auth headers. The timeline feature uses this
 * for its CRUD; ApiSource above remains the per-timeline save seam.
 * @param {string} name resource path segment, e.g. 'timelines'
 * @param {{ baseUrl?: string, getToken?: () => Promise<string|undefined> }} [opts]
 */
export function createResource(name, opts = {}) {
  const baseUrl = opts.baseUrl || '/api';
  const getToken = opts.getToken || (async () => undefined);
  async function headers() {
    const token = await getToken();
    const h = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }
  const url = (id) => (id ? `${baseUrl}/${name}/${id}` : `${baseUrl}/${name}`);
  async function req(u, init) {
    const res = await fetch(u, init);
    if (!res.ok) throw new Error(`${init?.method || 'GET'} ${u} failed: ${res.status}`);
    return res.json().catch(() => ({}));
  }
  return {
    async list() {
      return req(url(), { headers: await headers() });
    },
    async get(id) {
      return req(url(id), { headers: await headers() });
    },
    async create(data) {
      return req(url(), { method: 'POST', headers: await headers(), body: JSON.stringify(data) });
    },
    async update(id, data) {
      return req(url(id), { method: 'PUT', headers: await headers(), body: JSON.stringify(data) });
    },
    async remove(id) {
      return req(url(id), { method: 'DELETE', headers: await headers() });
    },
  };
}
