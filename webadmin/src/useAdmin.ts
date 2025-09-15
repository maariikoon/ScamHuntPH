// src/useAdmin.ts
import * as React from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/firebase";
import { getFirestore, doc, getDoc } from "firebase/firestore";

type AdminState = {
  ready: boolean;
  user: User | null;
  admin: boolean;
  claims?: Record<string, unknown>;
};

export function useAdmin(): AdminState {
  const [ready, setReady] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const [admin, setAdmin] = React.useState(false);
  const [claims, setClaims] = React.useState<Record<string, unknown> | undefined>(undefined);

  React.useEffect(() => {
    const db = getFirestore();
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);

        if (!u) {
          setAdmin(false);
          setClaims(undefined);
          return;
        }

        // refresh token so newest claims are present
        const tok = await u.getIdTokenResult(true);
        const c = tok.claims || {};
        setClaims(c);

        let isAdmin =
          c.admin === true ||
          c.role === "admin" ||
          c.role === "superadmin";

        // Firestore allow-list fallback: /admins/<uid> {active: true}
        if (!isAdmin) {
          const snap = await getDoc(doc(db, "admins", u.uid));
          if (snap.exists() && snap.data()?.active === true) {
            isAdmin = true;
          }
        }

        setAdmin(isAdmin);
      } catch {
        setAdmin(false);
        setClaims(undefined);
      } finally {
        setReady(true);
      }
    });

    return () => unsub();
  }, []);

  return { ready, user, admin, claims };
}
