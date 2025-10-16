// app/hooks/useUnreadAlerts.ts
import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "../../src/firebase";

/**
 * Live unread alerts count for the signed-in user.
 * Returns 0 if signed out or on any error.
 */
export function useUnreadAlerts(): number {
  const [unread, setUnread] = useState(0);

  // Keep a ref to the inner Firestore unsubscribe so we can safely clean it
  const alertsUnsubRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    // Clean up a prior alerts listener (if any)
    const stopAlertsListener = () => {
      if (alertsUnsubRef.current) {
        try {
          alertsUnsubRef.current();
        } catch {}
        alertsUnsubRef.current = null;
      }
    };

    const stopAuth = onAuthStateChanged(auth, (user: User | null) => {
      // Always clear the previous alerts listener when auth state changes
      stopAlertsListener();

      if (!user) {
        setUnread(0);
        return;
      }

      // Listen to the user's unread alerts only
      const qUnread = query(
        collection(db, "alerts"),
        where("userId", "==", user.uid),
        where("read", "==", false)
      );

      alertsUnsubRef.current = onSnapshot(
        qUnread,
        (snap) => {
          const next = snap.size;
          // Avoid redundant state updates
          setUnread((prev) => (prev === next ? prev : next));
        },
        (err) => {
          console.warn("[useUnreadAlerts] onSnapshot error:", err?.message || err);
          // Keep the last known good value; do not throw
        }
      );
    });

    return () => {
      stopAlertsListener();
      try {
        stopAuth();
      } catch {}
    };
  }, []);

  return unread;
}
