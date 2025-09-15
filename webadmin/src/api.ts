// src/api.ts
import { auth } from '@/firebase';

/** ========= Config (Functions base URL) =========
 * Examples:
 *  - Production: https://<region>-<project>.cloudfunctions.net
 *  - Emulator:   http://127.0.0.1:5001/<project>/asia-southeast1
 */
export const API_BASE =
  import.meta.env.VITE_FUNCTIONS_URL ||
  'http://127.0.0.1:5001/scamhuntph-b3485/asia-southeast1';

/** ========= Small helpers ========= */
async function authFetch(path: string, init: RequestInit = {}) {
  // Add Firebase ID token when logged in
  const u = auth.currentUser;
  const token = u ? await u.getIdToken() : '';
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch (e) {
    throw new Error(`Network error: ${(e as Error)?.message || 'Failed to fetch'}`);
  }

  // Try to parse JSON, but keep original text for clearer errors
  const ct = res.headers.get('content-type') || '';
  const maybeJson = ct.includes('application/json');
  const payload = maybeJson ? await res.json().catch(() => ({})) : {};

  if (!res.ok || (maybeJson && payload?.ok === false)) {
    const detail = (payload && (payload.error as string)) || `${res.status} ${res.statusText}`;
    throw new Error(`HTTP error: ${detail}`);
  }
  return payload;
}

/** ========= Types ========= */
export type Report = {
  id: string;
  status?: 'new' | 'review' | 'closed' | string;
  createdAt?: string | null; // ISO from backend
  updatedAt?: string | null; // ISO from backend
  // ...other fields you store (reporter info, evidence URLs, etc.)
};

export type ListReportsResp = { ok: true; data: Report[]; nextCursor: string | null };
export type GetReportResp = { ok: true; data: Report };
export type SetStatusResp = { ok: true };
export type StatsResp = { ok: true; data: Record<string, number> };

/** ========= Public API ========= */
export const api = {
  /** GET /reports?status=&limit=&cursor= */
  async listReports(params: Record<string, string | number> = {}): Promise<ListReportsResp> {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    ).toString();
    return authFetch(`/reports${q ? `?${q}` : ''}`);
  },

  /** GET /report/:id */
  async getReport(id: string): Promise<GetReportResp> {
    return authFetch(`/report/${encodeURIComponent(id)}`);
  },

  /** PATCH /report/:id/status  body: { status, note? } */
  async setStatus(id: string, body: { status: string; note?: string }): Promise<SetStatusResp> {
    return authFetch(`/report/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  /** GET /stats */
  async stats(): Promise<StatsResp> {
    return authFetch(`/stats`);
  },
};
