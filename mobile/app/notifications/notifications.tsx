// mobile/app/notifications/notifications.tsx
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "../../src/context/NotificationsContext";
import { markNotificationRead } from "../../src/services/notifications";

type NotificationItem = {
  id: string;
  title?: string | null;
  message?: string | null;
  read: boolean;
  createdAt?: string | null;
};

/* ---------- Theme ---------- */
const C = {
  bg: "#ffffff",
  text: "#0f172a",
  sub: "#64748b",
  line: "#e5e7eb",
  cardBg: "#f8fafc",
  primary: "#2563eb",
  primaryDark: "#1e40af",
  okBg: "#dcfce7",
  okText: "#166534",
  errBg: "#fee2e2",
  errText: "#991b1b",
};

export default function NotificationsPage() {
  const { notifications, unreadCount, refresh } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [refreshing, setRefreshing] = useState(false);

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  useEffect(() => {
    doRefresh();
  }, [doRefresh]);

  const onPressNotification = async (id: string, read: boolean) => {
    try {
      if (!read) await markNotificationRead(id);
    } finally {
      refresh();
    }
  };

  const onMarkAllRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.read);
      await Promise.all(unread.map((n) => markNotificationRead(n.id)));
    } finally {
      refresh();
    }
  };

  // Apply filter + safe sort
  const filtered = useMemo(() => {
    let list: NotificationItem[] = [...notifications];
    if (filter === "unread") list = list.filter((n) => !n.read);
    if (filter === "read") list = list.filter((n) => n.read);
    return list.sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [notifications, filter]);

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const status = getStatusMeta(item.title || "");

    return (
      <Pressable
        onPress={() => onPressNotification(item.id, item.read)}
        style={({ pressed }) => [
          S.card,
          !item.read && S.cardUnread,
          pressed && { opacity: 0.9 },
        ]}
      >
        {/* left accent for unread */}
        {!item.read && <View style={S.cardAccent} />}

        <View style={{ gap: 6 }}>
          <View style={S.titleRow}>
            <Text style={[S.title, !item.read && S.titleUnread]} numberOfLines={2}>
              {String(item.title || "Untitled")}
            </Text>
            {/* inline status chip when we can infer it */}
            {status && (
              <View style={[S.badge, status.badgeStyle]}>
                <Ionicons name={status.icon} size={12} color={status.color} />
                <Text style={[S.badgeText, { color: status.color }]}>{status.label}</Text>
              </View>
            )}
          </View>

          {!!item.message && (
            <Text style={S.message} numberOfLines={3}>
              {String(item.message)}
            </Text>
          )}

          <View style={S.metaRow}>
            {item.createdAt ? (
              <Text style={S.dateText}>
                {relativeTime(item.createdAt)} • {new Date(item.createdAt).toLocaleString()}
              </Text>
            ) : (
              <View />
            )}
            {!item.read && (
              <TouchableOpacity onPress={() => onPressNotification(item.id, item.read)}>
                <Text style={S.markRead}>Mark read</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={S.safeArea}>
      <View style={S.container}>
        {/* Header */}
        <View style={S.headerRow}>
          <Text style={S.headerTitle}>
            Notifications{unreadCount > 0 ? ` • ${unreadCount} unread` : ""}
          </Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={onMarkAllRead}>
              <Text style={S.headerAction}>Mark all as read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Segmented tabs */}
        <View style={S.tabsWrap}>
          {(["all", "unread", "read"] as const).map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[S.tab, active && S.tabActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[S.tabText, active && S.tabTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
                {active && <View style={S.tabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        {filtered.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 36 }}>
            <Text style={S.empty}>📭 No notifications.</Text>
            <TouchableOpacity onPress={doRefresh} style={S.emptyBtn}>
              <Text style={S.emptyBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(n) => n.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 18 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={doRefresh} />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* ---------- Helpers ---------- */
function relativeTime(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function getStatusMeta(title: string) {
  const t = title.toLowerCase();
  if (t.includes("approved")) {
    return {
      label: "Approved",
      icon: "checkmark-circle",
      color: C.okText,
      badgeStyle: { backgroundColor: C.okBg },
    };
  }
  if (t.includes("denied")) {
    return {
      label: "Denied",
      icon: "close-circle",
      color: C.errText,
      badgeStyle: { backgroundColor: C.errBg },
    };
  }
  return null as
    | { label: string; icon: any; color: string; badgeStyle: any }
    | null;
}

/* ---------- Styles ---------- */
const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, padding: 16 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 24, fontWeight: "800", color: C.text },
  headerAction: { color: C.primary, fontWeight: "800" },

  tabsWrap: {
    flexDirection: "row",
    backgroundColor: C.cardBg,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginTop: 14,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, position: "relative" },
  tabActive: { backgroundColor: "#e8eefc" },
  tabText: { color: C.sub, fontSize: 14, fontWeight: "700" },
  tabTextActive: { color: C.primaryDark },
  tabIndicator: {
    position: "absolute",
    height: 3,
    left: 10,
    right: 10,
    bottom: 4,
    backgroundColor: C.primary,
    borderRadius: 2,
  },

  empty: { color: C.sub, fontSize: 16 },
  emptyBtn: {
    marginTop: 10,
    backgroundColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyBtnText: { color: "#fff", fontWeight: "800" },

  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: C.cardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
    overflow: "hidden",
  },
  cardUnread: {
    backgroundColor: "#eef4ff",
    borderColor: "#c7d2fe",
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: C.primary,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },

  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { fontSize: 16, fontWeight: "800", color: C.text, flex: 1 },
  titleUnread: { color: C.primaryDark },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontWeight: "800" },

  message: { fontSize: 14, color: C.text },

  metaRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: { fontSize: 12, color: C.sub },
  markRead: { color: C.primary, fontSize: 12, fontWeight: "800" },
});
