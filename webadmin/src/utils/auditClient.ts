import { getAuth } from "firebase/auth";

export async function callLogLogin(endpointUrl: string) {
  const auth = getAuth();
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) return;
  await fetch(endpointUrl, { method: "POST", headers: { Authorization: `Bearer ${idToken}` } });
}

export async function callLogLogout(endpointUrl: string) {
  const auth = getAuth();
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) return;
  await fetch(endpointUrl, { method: "POST", headers: { Authorization: `Bearer ${idToken}` } });
}
