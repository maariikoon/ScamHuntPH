import { getIdToken } from "firebase/auth";
import { auth } from "../firebase"; // adjust path to your firebase.ts

const BASE_URL = "https://api-bcvrqgcc6a-as.a.run.app"; // your backend URL

async function authedFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");

  const token = await getIdToken(user, true);
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}

export const MobileApi = {
  heartbeat: async (login = false) =>
    authedFetch<{ ok: boolean; message: string }>("/admin/users/heartbeat", {
      method: "POST",
      body: JSON.stringify({ login }),
    }),
};
