// mobile/app/(tabs)/alerts.tsx
import { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from "react-native";
import { Link } from "expo-router";
import { useNotifications } from "../../src/context/NotificationsContext";
import { markNotificationRead } from "../../src/services/notifications";

export default function Alerts() {
  const { notifications, unreadCount, refresh } = useNotifications();

  useEffect(() => {
    // ensure we have fresh data whenever Alerts mounts
    refresh();
  }, [refresh]);

  const onPressNotification = async (id: string, read: boolean) => {
    try {
      if (!read) await markNotificationRead(id);
    } finally {
      // pull latest so the bell dot + list update together
      refresh();
    }
  };

  return (
    <View style={styles.container}>
      {/* Notifications header */}
      <Text style={styles.title}>
        Notifications{unreadCount > 0 ? ` • ${unreadCount} unread` : ""}
      </Text>

      {/* Notifications list */}
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refresh} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No notifications yet.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onPressNotification(item.id, item.read)}
            style={[styles.nCard, !item.read && styles.nCardUnread]}
          >
            <Text style={[styles.nTitle, !item.read && styles.nTitleUnread]}>
              {item.title}
            </Text>
            {!!item.message && <Text style={styles.nMessage}>{item.message}</Text>}
            {item.createdAt && (
              <Text style={styles.nDate}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            )}
          </TouchableOpacity>
        )}
        // Footer keeps your existing quick links below the history
        ListFooterComponent={() => (
          <View style={{ marginTop: 24 }}>
            {/* Navigate to Your Reports */}
            <Link href="/reports/myreports" asChild>
              <TouchableOpacity style={styles.card}>
                <Text style={styles.emoji}>📄</Text>
                <Text style={styles.cardText}>Your Reports</Text>
              </TouchableOpacity>
            </Link>

            {/* Navigate to Scam Trends */}
            <Link href="/scam-trends" asChild>
              <TouchableOpacity style={styles.card}>
                <Text style={styles.emoji}>🚨</Text>
                <Text style={styles.cardText}>Scam Trends</Text>
              </TouchableOpacity>
            </Link>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },

  // Notifications
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  empty: { fontSize: 16, color: "#777", marginBottom: 16 },
  nCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
    marginBottom: 10,
  },
  nCardUnread: {
    backgroundColor: "#eef4ff",
    borderColor: "#bcd2ff",
  },
  nTitle: { fontSize: 16, fontWeight: "600", color: "#222" },
  nTitleUnread: { color: "#0a53ff" },
  nMessage: { fontSize: 14, color: "#555", marginTop: 4 },
  nDate: { fontSize: 12, color: "#888", marginTop: 6 },

  // Quick links
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  emoji: { fontSize: 28, marginRight: 12 },
  cardText: { fontSize: 18, fontWeight: "600" },
});
