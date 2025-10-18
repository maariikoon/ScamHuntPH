// app/(tabs)/_layout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Tabs, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Pressable, StyleSheet, Text, Platform } from "react-native";
import { useNotifications } from "../../src/context/NotificationsContext";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";

const C = {
  text: "#0f172a",
  line: "#e6eaf0",
  blue50: "#eff6ff",
  blue100: "#dbeafe",
  blue600: "#2563eb",
  danger: "#ef4444",
};

const formatCount = (n: number) => (n > 9 ? "9+" : n);

type BellIconProps = Readonly<{ unreadCount: number; onPress: () => void }>;
const BellIcon = React.memo(function BellIcon({ unreadCount, onPress }: BellIconProps) {
  const { t } = useTranslation("common");
  const display = formatCount(unreadCount);
  const a11yLabel =
    unreadCount > 0
      ? t("tabs.alertsUnread", { defaultValue: "{{count}} unread alerts", count: unreadCount })
      : t("tabs.openAlerts", { defaultValue: "Open alerts" });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [S.bellWrap, pressed && { opacity: 0.6 }]}
      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={t("tabs.alertsHint", { defaultValue: "Opens your notifications and alerts" })}
    >
      <Ionicons name="notifications-outline" size={26} color={C.blue600} />
      {unreadCount > 0 && (
        <View style={S.badge}>
          <Text style={S.badgeText} numberOfLines={1} allowFontScaling={false}>
            {display}
          </Text>
        </View>
      )}
    </Pressable>
  );
});

export default function TabsLayout() {
  const { t } = useTranslation("common");
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { unreadCount, refresh } = useNotifications();

  const [lang, setLang] = useState<"en" | "fil">(() => {
    const l = (i18n.language || "en").toLowerCase();
    return l.startsWith("fil") || l.startsWith("tl") ? "fil" : "en";
  });
  useEffect(() => {
    const onLang = (l: string) => {
      const norm = (l || "en").toLowerCase();
      setLang(norm.startsWith("fil") || norm.startsWith("tl") ? "fil" : "en");
    };
    i18n.on("languageChanged", onLang);
    return () => i18n.off("languageChanged", onLang);
  }, []);

  const alertsBadge = useMemo(() => (unreadCount > 0 ? formatCount(unreadCount) : undefined), [unreadCount]);

  useFocusEffect(React.useCallback(() => { refresh?.(); }, [refresh]));

  return (
    <Tabs
      key={lang}
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "left",
        headerTitleStyle: { fontWeight: "800", color: C.text },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#fff" },
        tabBarActiveTintColor: C.blue600,
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: { fontWeight: "700", fontSize: 12 },
        tabBarStyle: [
          S.tabBar,
          { paddingBottom: Math.max(insets.bottom, 6), height: 56 + insets.bottom },
        ],
        headerRight: () => (
          <View style={{ marginRight: 12 }}>
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
          title: t("tabs.home", { defaultValue: "Home" }),
          tabBarLabel: t("tabs.home", { defaultValue: "Home" }),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: t("tabs.learn", { defaultValue: "Learn" }),
          tabBarLabel: t("tabs.learn", { defaultValue: "Learn" }),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "book" : "book-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: t("tabs.report", { defaultValue: "Report" }),
          tabBarLabel: t("tabs.report", { defaultValue: "Report" }),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "create" : "create-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: t("tabs.alerts", { defaultValue: "Alerts" }),
          tabBarLabel: t("tabs.alerts", { defaultValue: "Alerts" }),
          tabBarBadge: alertsBadge,
          tabBarBadgeStyle: S.tabBadge,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "notifications" : "notifications-outline"} size={size} color={color} />
          ),
          tabBarButton: (props) => (
            <Pressable
              {...props}
              onPress={(e) => {
                props.onPress?.(e);
                refresh?.();
              }}
              ref={undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile", { defaultValue: "Profile" }),
          tabBarLabel: t("tabs.profile", { defaultValue: "Profile" }),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const S = StyleSheet.create({
  tabBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: C.line,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: -2 } },
      android: { elevation: 8 },
    }),
  },
  bellWrap: { paddingHorizontal: 6, paddingVertical: 4 },
  badge: {
    position: "absolute",
    right: Platform.select({ ios: 2, android: 0 }) as number,
    top: Platform.select({ ios: -4, android: -6 }) as number,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: C.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 12,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  tabBadge: {
    backgroundColor: C.danger,
    color: "#fff",
    fontWeight: "800",
    minWidth: 18,
    height: 18,
    lineHeight: 18,
    textAlign: "center",
  },
});
