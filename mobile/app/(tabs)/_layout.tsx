// app/(tabs)/_layout.tsx
import React from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Pressable, StyleSheet, Text, Platform } from "react-native";
import { useNotifications } from "../../src/context/NotificationsContext";
import { useTranslation } from "react-i18next";

/* ---------- Bell with number badge ---------- */
type BellIconProps = Readonly<{
  unreadCount: number;
  onPress: () => void;
}>;

const BellIcon = React.memo(function BellIcon({ unreadCount, onPress }: BellIconProps) {
  const { t } = useTranslation();
  const display = unreadCount > 9 ? "9+" : unreadCount;

  const a11yLabel =
    unreadCount > 0
      ? t("tabs.alertsUnread", "{{count}} unread alerts", { count: unreadCount })
      : t("tabs.openAlerts", "Open alerts");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.bellWrap, pressed && { opacity: 0.6 }]}
      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={t("tabs.alertsHint", "Opens your notifications and alerts")}
    >
      <Ionicons name="notifications-outline" size={28} color="#007AFF" />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1} allowFontScaling={false}>
            {display}
          </Text>
        </View>
      )}
    </Pressable>
  );
});

/* ---------- Tabs Layout ---------- */
export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { unreadCount, refresh } = useNotifications();

  const alertsBadge =
    unreadCount > 0 ? (unreadCount > 9 ? "9+" : unreadCount) : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "left",
        tabBarActiveTintColor: "#007AFF",
        tabBarStyle: {
          paddingBottom: insets.bottom > 0 ? insets.bottom : 5,
          height: 60 + insets.bottom,
        },
        headerRight: () => (
          <View style={{ marginRight: 10 }}>
            <BellIcon
              unreadCount={unreadCount}
              onPress={() => {
                router.push("/notifications/notifications");
                refresh?.();
              }}
            />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("tabs.home", "Home"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: t("tabs.learn", "Learn"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: t("tabs.report", "Report"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="create-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: t("tabs.alerts", "Alerts"),
          tabBarBadge: alertsBadge,
          tabBarBadgeStyle: {
            backgroundColor: "#ef4444",
            color: "#fff",
            fontWeight: "700",
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile", "Profile"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  bellWrap: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  badge: {
    position: "absolute",
    right: Platform.select({ ios: 2, android: 1 }) as number,
    top: Platform.select({ ios: -2, android: -3 }) as number,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 12,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
