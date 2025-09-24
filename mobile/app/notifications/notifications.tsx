// mobile/app/notifications/notifications.tsx
import { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNotifications } from "../../src/context/NotificationsContext";
import { markNotificationRead } from "../../src/services/notifications";

type NotificationItem = {
  id: string;
  title?: string | null;
  message?: string | null;
  read: boolean;
  createdAt?: string | null;
};

export default function NotificationsPage() {
  const { notifications, unreadCount, refresh } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  useEffect(() => {
    refresh();
  }, [refresh]);

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
      for (const n of unread) {
        await markNotificationRead(n.id);
      }
    } finally {
      refresh();
    }
  };

  // Apply filter + safe sort
  const filtered = useMemo(() => {
    let list: NotificationItem[] = [...notifications];
    if (filter === "unread") {
      list = list.filter((n) => !n.read);
    } else if (filter === "read") {
      list = list.filter((n) => n.read);
    }

    return list.sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [notifications, filter]);

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      onPress={() => onPressNotification(item.id, item.read)}
      style={[styles.nCard, !item.read && styles.nCardUnread]}
    >
      <Text style={[styles.nTitle, !item.read && styles.nTitleUnread]}>
        {String(item.title || "Untitled")}
      </Text>
      {item.message ? (
        <Text style={styles.nMessage}>{String(item.message)}</Text>
      ) : null}
      {item.createdAt ? (
        <Text style={styles.nDate}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Title */}
        <Text style={styles.title}>
          Notifications {unreadCount > 0 ? ` • ${unreadCount} unread` : ""}
        </Text>

        {/* Mark all as read */}
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllRow} onPress={onMarkAllRead}>
            <Text style={styles.markAll}>Mark all as read</Text>
          </TouchableOpacity>
        )}

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {["all", "unread", "read"].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.tab, filter === f && styles.tabActive]}
              onPress={() => setFilter(f as any)}
            >
              <Text
                style={[
                  styles.tabText,
                  filter === f && styles.tabTextActive,
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        {filtered.length === 0 ? (
          <Text style={styles.empty}>📭 No notifications.</Text>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(n) => n.id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={false} onRefresh={refresh} />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 20 },

  title: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },

  markAllRow: { alignItems: "flex-end", marginBottom: 12 },
  markAll: { fontSize: 14, color: "#0a53ff", fontWeight: "600" },

  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#0a53ff",
  },
  tabText: { fontSize: 16, color: "#555" },
  tabTextActive: { color: "#0a53ff", fontWeight: "bold" },

  empty: { fontSize: 16, color: "#777", textAlign: "center", marginTop: 40 },

  nCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
    marginBottom: 10,
  },
  nCardUnread: { backgroundColor: "#eef4ff", borderColor: "#bcd2ff" },
  nTitle: { fontSize: 16, fontWeight: "600", color: "#222" },
  nTitleUnread: { color: "#0a53ff" },
  nMessage: { fontSize: 14, color: "#555", marginTop: 4 },
  nDate: { fontSize: 12, color: "#888", marginTop: 6 },
});
