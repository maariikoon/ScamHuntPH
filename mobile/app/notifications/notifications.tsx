// mobile/app/notifications/notifications.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "../../src/context/NotificationsContext";
import { markNotificationRead } from "../../src/services/notifications";

/* ---------- Types ---------- */
type NotificationItem = {
  id: string;
  title?: string | null;
  message?: string | null;
  read: boolean;
  createdAt?: string | null; // ISO
};

type FilterKey = "all" | "unread" | "read";

/* ---------- Theme ---------- */
const C = {
  bg: "#ffffff",
  text: "#0f172a",
  sub: "#64748b",
  line: "#e6eaf0",
  cardBg: "rgba(248, 250, 252, 0.92)",
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  okBg: "#dcfce7",
  okText: "#166534",
  errBg: "#fee2e2",
  errText: "#991b1b",
  blue50: "#eff6ff",
  blue100: "#dbeafe",
};

/* ---------- Utils ---------- */
const fmtRelative = (iso?: string | null) => {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

type StatusMeta = { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; color: string; chipBg: string } | null;

const getStatusMeta = (title?: string | null): StatusMeta => {
  const t = (title || "").toLowerCase();
  if (!t) return null;
  if (t.includes("approved") || t.includes("verified")) {
    return { label: "Approved", icon: "checkmark-circle", color: C.okText, chipBg: C.okBg };
  }
  if (t.includes("denied") || t.includes("declined") || t.includes("rejected")) {
    return { label: "Denied", icon: "close-circle", color: C.errText, chipBg: C.errBg };
  }
  return null;
};

/* ---------- Screen ---------- */
export default function NotificationsPage() {
  const { notifications, unreadCount, refresh } = useNotifications();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [refreshing, setRefreshing] = useState(false);

  // optimistic local state for read flags during actions
  const [localReadMap, setLocalReadMap] = useState<Record<string, true>>({});

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      setLocalReadMap({}); // clear optimistic overrides after a fresh pull
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  useEffect(() => {
    doRefresh();
  }, [doRefresh]);

  const withOptimisticRead = useCallback(
    (list: NotificationItem[]): NotificationItem[] =>
      list.map((n) => (localReadMap[n.id] ? { ...n, read: true } : n)),
    [localReadMap]
  );

  const baseSorted = useMemo(() => {
    const list = withOptimisticRead(notifications);
    return [...list].sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [notifications, withOptimisticRead]);

  const counts = useMemo(() => {
    const all = baseSorted.length;
    const unread = baseSorted.filter((n) => !n.read).length;
    const read = all - unread;
    return { all, unread, read };
  }, [baseSorted]);

  const filtered = useMemo(() => {
    if (filter === "unread") return baseSorted.filter((n) => !n.read);
    if (filter === "read") return baseSorted.filter((n) => n.read);
    return baseSorted;
  }, [baseSorted, filter]);

  const markOneRead = useCallback(
    async (id: string, alreadyRead: boolean) => {
      if (alreadyRead) return;
      // optimistic update
      setLocalReadMap((m) => ({ ...m, [id]: true }));
      try {
        await markNotificationRead(id);
      } catch {
        // roll back on failure
        setLocalReadMap((m) => {
          const copy = { ...m };
          delete copy[id];
          return copy;
        });
      } finally {
        refresh();
      }
    },
    [refresh]
  );

  const markAllRead = useCallback(async () => {
    const ids = baseSorted.filter((n) => !n.read).map((n) => n.id);
    if (ids.length === 0) return;
    // optimistic update
    setLocalReadMap((m) => ({ ...m, ...Object.fromEntries(ids.map((id) => [id, true as const])) }));
    try {
      await Promise.all(ids.map((id) => markNotificationRead(id)));
    } catch {
      // if any fail, just refetch; UI will correct
    } finally {
      refresh();
    }
  }, [baseSorted, refresh]);

  const renderItem = useCallback(
    ({ item }: { item: NotificationItem }) => {
      const read = !!item.read || !!localReadMap[item.id];
      const status = getStatusMeta(item.title);

      return (
        <Pressable
          onPress={() => markOneRead(item.id, read)}
          android_ripple={{ color: C.blue100 }}
          style={({ pressed }) => [S.card, !read && S.cardUnread, pressed && { opacity: 0.95 }]}
        >
          {!read && <View style={S.cardAccent} />}

          <View style={{ gap: 6 }}>
            <View style={S.titleRow}>
              <Text style={[S.title, !read && S.titleUnread]} numberOfLines={2}>
                {String(item.title || "Untitled")}
              </Text>

              {status && (
                <View style={[S.badge, { backgroundColor: status.chipBg }]}>
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
                  {fmtRelative(item.createdAt)} • {new Date(item.createdAt).toLocaleString()}
                </Text>
              ) : (
                <View />
              )}
              {!read && (
                <TouchableOpacity onPress={() => markOneRead(item.id, read)}>
                  <Text style={S.markRead}>Mark read</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Pressable>
      );
    },
    [localReadMap, markOneRead]
  );

  const keyExtractor = useCallback((n: NotificationItem) => n.id, []);

  return (
    <SafeAreaView style={S.safeArea}>
      <View style={S.container}>
        {/* Header */}
        <View style={S.headerRow}>
          <Text style={S.headerTitle}>
            Notifications{unreadCount > 0 ? ` • ${unreadCount} unread` : ""}
          </Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} accessibilityRole="button">
              <Text style={S.headerAction}>Mark all as read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Segmented filter */}
        <View style={S.tabsWrap}>
          {(["all", "unread", "read"] as const).map((k) => {
            const active = filter === k;
            const count = counts[k];
            return (
              <Pressable
                key={k}
                onPress={() => setFilter(k)}
                style={({ pressed }) => [S.tab, active && S.tabActive, pressed && { opacity: 0.9 }]}
                android_ripple={{ color: C.blue100 }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[S.tabText, active && S.tabTextActive]}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </Text>
                <View style={[S.tabBadge, active && S.tabBadgeActive]}>
                  <Text style={[S.tabBadgeText, active && S.tabBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* List */}
        {filtered.length === 0 ? (
          <View style={S.emptyWrap}>
            <View style={S.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={24} color={C.sub} />
            </View>
            <Text style={S.empty}>No notifications.</Text>
            <TouchableOpacity onPress={doRefresh} style={S.emptyBtn}>
              <Text style={S.emptyBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 18 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} />}
            initialNumToRender={8}
            windowSize={7}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, padding: 16 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 24, fontWeight: "800", color: C.text },
  headerAction: { color: C.primary, fontWeight: "800" },

  /* Tabs */
  tabsWrap: {
    flexDirection: "row",
    backgroundColor: C.cardBg,
    borderRadius: 12,
    padding: 6,
    marginTop: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.line,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    position: "relative",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  tabActive: { backgroundColor: C.blue50, borderColor: C.blue100 },
  tabText: { color: C.sub, fontSize: 14, fontWeight: "700" },
  tabTextActive: { color: C.primaryDark },
  tabBadge: {
    minWidth: 22,
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 9,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeActive: { backgroundColor: C.blue100 },
  tabBadgeText: { fontSize: 12, fontWeight: "800", color: "#475569" },
  tabBadgeTextActive: { color: C.primaryDark },

  /* Empty */
  emptyWrap: { alignItems: "center", marginTop: 36, gap: 8 },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.blue50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.blue100,
  },
  empty: { color: C.sub, fontSize: 16 },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyBtnText: { color: "#fff", fontWeight: "800" },

  /* Cards */
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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

  metaRow: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateText: { fontSize: 12, color: C.sub },
  markRead: { color: C.primary, fontSize: 12, fontWeight: "800" },
});
