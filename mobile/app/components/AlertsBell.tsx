// app/components/AlertsBell.tsx
import { View, Pressable, StyleSheet, Text } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUnreadAlerts } from "../hooks/useUnreadAlerts";

const COLOR_PRIMARY = "#2563eb";

export default function AlertsBell() {
  const unread = useUnreadAlerts();

  return (
    <Link href="/alerts" asChild>
      <Pressable style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.6 }]}>
        <Ionicons name="notifications-outline" size={24} color={COLOR_PRIMARY} />

        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unread > 9 ? "9+" : unread}
            </Text>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingVertical: 6 },

  badge: {
    position: "absolute",
    right: 6,
    top: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ef4444", // red-500
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: "#fff", // gives a clean border
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});
