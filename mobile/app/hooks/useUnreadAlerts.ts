// app/hooks/useUnreadAlerts.ts
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "../../src/firebase"; // adjust path if needed

export function useUnreadAlerts() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let unsubscribeAuth = () => {};
    let unsubscribeAlerts = () => {};

    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeAlerts) unsubscribeAlerts();

      if (!user) {
        setUnread(0);
        return;
      }

      const qUnread = query(
        collection(db, "alerts"),
        where("userId", "==", user.uid),
        where("read", "==", false)
      );

      unsubscribeAlerts = onSnapshot(qUnread, (snap) => {
        setUnread(snap.size);
      });
    });

    return () => {
      if (unsubscribeAlerts) unsubscribeAlerts();
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  return unread;
}
