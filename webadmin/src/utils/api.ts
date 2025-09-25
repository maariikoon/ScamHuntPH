// src/utils/api.ts
import { getFreshIdToken } from '@/utils/token';

/* ---------- Small helpers ---------- */
const trim = (s?: string) => (s || '').replace(/\/+$/, '');
const join = (a: string, b: string) => `${trim(a)}/${(b || '').replace(/^\/+/, '')}`;
const toQS = (params: Record<string, unknown> = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
};
const DEFAULT_TIMEOUT_MS = 15000;

/* ---------- Base URLs (Reports) ---------- */
const REPORTS_BASE_ENV   = trim(import.meta.env.VITE_REPORTS_BASE);
const API_BASE           = trim(import.meta.env.VITE_API_BASE_URL);
const REPORTS_PREFIX     = import.meta.env.VITE_REPORTS_PREFIX ?? '/reports';
const FUNCTIONS_URL      = trim(import.meta.env.VITE_FUNCTIONS_URL);

// ✅ Pick the correct base for Reports
export const REPORTS_BASE =
  REPORTS_BASE_ENV ||
  (API_BASE && REPORTS_PREFIX ? join(API_BASE, REPORTS_PREFIX) : '') ||
  (FUNCTIONS_URL ? join(FUNCTIONS_URL, 'reports') : '');

/* ---------- Generic Auth Fetch for Reports endpoints ---------- */
export async function authFetch<T = unknown>(url: string, init: RequestInit = {}) {
  const absoluteUrl = /^https?:\/\//i.test(url) ? url : join(REPORTS_BASE, url);

  const token = await getFreshIdToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(absoluteUrl, {
      ...init,
      mode: 'cors',
      credentials: 'omit',
      headers,
      signal: controller.signal,
    });
    clearTimeout(t);

    const ct = res.headers.get('content-type') || '';
    const isJson = ct.includes('application/json');
    const text = await res.text();
    let data: T | undefined;
    if (isJson && text) {
      try { data = JSON.parse(text) as T; } catch (error) {
        console.error('[authFetch] JSON parse error', { text, error });
      }
    }

    return { ok: res.ok, status: res.status, data, text };
  } catch (err) {
    clearTimeout(t);
    console.error('[authFetch] Network error', { absoluteUrl, err });
    throw new Error('Failed to fetch');
  }
}

/* ---------- Admin API (backend endpoints) ---------- */
const RAW_BASE = import.meta.env.VITE_BACKEND_URL ?? 'https://scamhunt-bcvrqgcc6a-as.a.run.app';
const BASE = trim(RAW_BASE);

// Core authed request for Admin API
async function authedFetch<T = unknown>(path: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const idToken = await getFreshIdToken();
  const url = join(BASE, path);

  const headers = new Headers(init.headers || {});
  if (idToken) headers.set('Authorization', `Bearer ${idToken}`);
  // Only set Content-Type when we actually send a body
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      mode: 'cors',
      credentials: 'omit',
      headers,
      signal: controller.signal,
    });
  } catch (e: unknown) {
    clearTimeout(t);
    const errorMessage = e instanceof Error ? e.message : 'Failed to fetch';
    throw new Error(`Network error: ${errorMessage}`);
  }
  clearTimeout(t);

  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');
  const text = await res.text();

  if (!res.ok) {
    let detail: string | undefined;
    if (isJson && text) {
      try {
        const j = JSON.parse(text);
        detail = j?.error || j?.message;
      } catch { /* ignore */ }
    }
    throw new Error(`HTTP ${res.status}: ${detail || text || res.statusText}`);
  }

  if (!text) return {} as T;
  if (isJson) {
    try { return JSON.parse(text) as T; } catch { /* fallthrough */ }
  }
  // If backend didn't return JSON, return raw text
  return text as unknown as T;
}

export const AdminApi = {
  // Prefer POST /admin/users:list, fallback to GET /admin/users?...
  async listUsers(params: Record<string, string | number | undefined>) {
    try {
      return await authedFetch(`/admin/users:list`, {
        method: 'POST',
        body: JSON.stringify(params ?? {}),
      });
    } catch (e: unknown) {
      if (e instanceof Error && (e.message.includes('HTTP 404') || e.message.includes('HTTP 405'))) {
        // Fallback to GET shape
        return await authedFetch(`/admin/users${toQS(params)}`);
      }
      throw e;
    }
  },

  getUser: async (uid: string) =>
    authedFetch(`/admin/users/${encodeURIComponent(uid)}`),

  createAdmin: async (payload: { email: string; displayName?: string; role?: string }) =>
    authedFetch(`/admin/users`, { method: 'POST', body: JSON.stringify(payload) }),

  resetUser: async (uid: string, payload = { revokeTokens: true, sendReset: true }) =>
    authedFetch(`/admin/users/${encodeURIComponent(uid)}/reset`, { method: 'POST', body: JSON.stringify(payload) }),

  setRole: async (uid: string, role: string) =>
    authedFetch(`/admin/users/${encodeURIComponent(uid)}/role`, { method: 'POST', body: JSON.stringify({ role }) }),

  suspend: async (uid: string, reason: string) =>
    authedFetch(`/admin/users/${encodeURIComponent(uid)}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) }),

  reactivate: async (uid: string) =>
    authedFetch(`/admin/users/${encodeURIComponent(uid)}/reactivate`, { method: 'POST' }),

  activeAdmins: async (window = '24h') =>
    authedFetch(`/admin/metrics/active-admins${toQS({ window })}`),

  // Prefer /admin/heartbeat, fallback to /me/heartbeat
  async heartbeat(login = false) {
    try {
      return await authedFetch(`/admin/heartbeat`, {
        method: 'POST',
        body: JSON.stringify({ login }),
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('HTTP 404')) {
        return await authedFetch(`/me/heartbeat`, {
          method: 'POST',
          body: JSON.stringify({ login }),
        });
      }
      throw e;
    }
  },
};
