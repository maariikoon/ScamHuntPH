//mobile/src/context/NotificationsContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth } from "@/src/firebase";

const API_BASE_URL = "https://notifications-bcvrqgcc6a-as.a.run.app"; 

type Notification = {
  id: string;
  title?: string | null;
  message?: string | null;
  read: boolean;
  createdAt?: string | null;
};

type NotificationsContextType = {
  notifications: Notification[];
  unreadCount: number;
  refresh: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  refresh: async () => {},
});

export const useNotifications = () => useContext(NotificationsContext);

export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
      setNotifications(
        (data.notifications || []).map((n: any) => ({
          ...n,
          title: n.title ?? "",
          message: n.message ?? "",
          createdAt: n.createdAt ?? null,
        }))
      );
    }
    } catch (err) {
      console.error("❌ Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  refresh();
    }, [refresh]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, refresh }}>
      {children}
    </NotificationsContext.Provider>
  );
};
