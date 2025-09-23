// src/utils/api.ts
import { getFreshIdToken } from '@/utils/token';

function trim(s?: string) { return (s || '').replace(/\/+$/, ''); }
function join(a: string, b: string) {
  const A = trim(a); const B = b.replace(/^\/+/, '');
  return `${A}/${B}`;
}

const REPORTS_BASE_ENV   = trim(import.meta.env.VITE_REPORTS_BASE);
const API_BASE           = trim(import.meta.env.VITE_API_BASE_URL);
const REPORTS_PREFIX     = (import.meta.env.VITE_REPORTS_PREFIX ?? '/reports');
const FUNCTIONS_URL      = trim(import.meta.env.VITE_FUNCTIONS_URL);

// ✅ Pick the correct base for Reports
export const REPORTS_BASE =
  REPORTS_BASE_ENV ||
  (API_BASE && REPORTS_PREFIX ? join(API_BASE, REPORTS_PREFIX) : '') ||
  (FUNCTIONS_URL ? join(FUNCTIONS_URL, 'reports') : '');

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
