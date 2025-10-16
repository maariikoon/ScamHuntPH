// components/AlertsBell.tsx
import React from "react";
import { Pressable, View, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUnreadAlerts } from "../hooks/useUnreadAlerts";
; // adjust import path as needed

const C = {
  blue600: "#2563eb",
  danger: "#ef4444",
};

const fmt = (n: number) => (n > 9 ? "9+" : String(n));

export function AlertsBell({ onPress }: { onPress?: () => void }) {
  const unread = useUnreadAlerts();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [S.wrap, pressed && { opacity: 0.6 }]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `${unread} unread alerts` : "Open alerts"}
      accessibilityHint="Opens your notifications and alerts"
    >
      <Ionicons name="notifications-outline" size={26} color={C.blue600} />
      {unread > 0 && (
        <View style={S.badge}>
          <Text style={S.badgeTxt} numberOfLines={1} allowFontScaling={false}>
            {fmt(unread)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const S = StyleSheet.create({
  wrap: { paddingHorizontal: 6, paddingVertical: 4 },
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
  badgeTxt: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 12,
    textAlignVertical: "center",
    includeFontPadding: false,
  },
});
