// src/utils/api.ts
import { getFreshIdToken } from '@/utils/token';

/* ---------- Helpers ---------- */
function trim(s?: string) { return (s || '').replace(/\/+$/, ''); }
function join(a: string, b: string) {
  const A = trim(a); const B = b.replace(/^\/+/, '');
  return `${A}/${B}`;
}

/* ---------- Base URLs ---------- */
const REPORTS_BASE_ENV   = trim(import.meta.env.VITE_REPORTS_BASE);
const API_BASE           = trim(import.meta.env.VITE_API_BASE_URL);
const REPORTS_PREFIX     = (import.meta.env.VITE_REPORTS_PREFIX ?? '/reports');
const FUNCTIONS_URL      = trim(import.meta.env.VITE_FUNCTIONS_URL);

// ✅ Pick the correct base for Reports
export const REPORTS_BASE =
  REPORTS_BASE_ENV ||
  (API_BASE && REPORTS_PREFIX ? join(API_BASE, REPORTS_PREFIX) : '') ||
  (FUNCTIONS_URL ? join(FUNCTIONS_URL, 'reports') : '');

/* ---------- Generic Auth Fetch ---------- */
export async function authFetch<T = unknown>(url: string, init: RequestInit = {}) {
  // If a path like '/:id' is passed, attach the reports base
  const absoluteUrl = /^https?:\/\//i.test(url) ? url : join(REPORTS_BASE, url);

  const token = await getFreshIdToken();
  try {
    const res = await fetch(absoluteUrl, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
    });
    const text = await res.text();
    let data: T | undefined;
    try { data = text ? JSON.parse(text) as T : undefined; } catch (error) {
      console.error('[authFetch] JSON parse error', { text, error });
    }
    return { ok: res.ok, status: res.status, data, text };
  } catch (err) {
    console.error('[authFetch] Network error', { absoluteUrl, err });
    throw new Error('Failed to fetch'); // keeps your UI message
  }
}

/* ---------- Admin API (backend endpoints) ---------- */
const BASE = import.meta.env.VITE_BACKEND_URL ?? 'https://scamhunt-bcvrqgcc6a-as.a.run.app';

async function authedFetch(path: string, init: RequestInit = {}) {
  const idToken = await getFreshIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${idToken}`);
  headers.set('Content-Type', 'application/json');
  return fetch(`${BASE}${path}`, { ...init, headers });
}

export const AdminApi = {
  listUsers: async (params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.append(k, String(v));
    });
    const r = await authedFetch(`/admin/users?${qs.toString()}`);
    return r.json();
  },
  getUser: async (uid: string) =>
    (await authedFetch(`/admin/users/${uid}`)).json(),
  createAdmin: async (payload: { email: string; displayName?: string; role?: string }) =>
    (await authedFetch('/admin/users', { method: 'POST', body: JSON.stringify(payload) })).json(),
  resetUser: async (uid: string, payload = { revokeTokens: true, sendReset: true }) =>
    (await authedFetch(`/admin/users/${uid}/reset`, { method: 'POST', body: JSON.stringify(payload) })).json(),
  setRole: async (uid: string, role: string) =>
    (await authedFetch(`/admin/users/${uid}/role`, { method: 'POST', body: JSON.stringify({ role }) })).json(),
  suspend: async (uid: string, reason: string) =>
    (await authedFetch(`/admin/users/${uid}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) })).json(),
  reactivate: async (uid: string) =>
    (await authedFetch(`/admin/users/${uid}/reactivate`, { method: 'POST' })).json(),
  activeAdmins: async (window = '24h') =>
    (await authedFetch(`/admin/metrics/active-admins?window=${window}`)).json(),
  heartbeat: async (login = false) =>
    (await authedFetch('/me/heartbeat', { method: 'POST', body: JSON.stringify({ login }) })).json(),
};
