// mobile/app/(tabs)/alerts.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "../../src/context/NotificationsContext";

/* ---------- Theme ---------- */
const C = {
  bg: "#ffffff",
  text: "#0f172a",
  sub: "#64748b",
  line: "#e5e7eb",
  cardBg: "#f8fafc",
  primary: "#2563eb",
  primaryDark: "#1e40af",
  danger: "#ef4444",
};

export default function Alerts() {
  const { unreadCount } = useNotifications();

  return (
    <SafeAreaView style={S.safeArea}>
      <ScrollView contentContainerStyle={S.scroll}>
        {/* Header */}
        <Text style={S.title}>Quick Links</Text>

        {/* Unread banner */}
        {unreadCount > 0 && (
          <Link href="/notifications/notifications" asChild>
            <Pressable style={({ pressed }) => [S.banner, pressed && { opacity: 0.9 }]}>
              <Ionicons name="notifications-outline" size={18} color={C.primaryDark} />
              <Text style={S.bannerText}>
                You have <Text style={{ fontWeight: "800" }}>{unreadCount > 9 ? "9+" : unreadCount}</Text> unread
                {unreadCount === 1 ? " alert" : " alerts"} — tap to view
              </Text>
              <Ionicons name="chevron-forward" size={18} color={C.primaryDark} />
            </Pressable>
          </Link>
        )}

        {/* Cards */}
        <View style={{ gap: 12 }}>
          <Link href="/reports/myreports" asChild>
            <TouchableOpacity activeOpacity={0.88} style={S.card}>
              <View style={S.cardAccent} />
              <View style={S.iconWrap}>
                <Ionicons name="document-text-outline" size={22} color={C.primary} />
              </View>
              <View style={S.cardBody}>
                <Text style={S.cardTitle}>Your Reports</Text>
                <Text style={S.cardSub}>View, track, and manage your submissions.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.sub} />
            </TouchableOpacity>
          </Link>

          <Link href="/scam-trends" asChild>
            <TouchableOpacity activeOpacity={0.88} style={S.card}>
              <View style={[S.cardAccent, { backgroundColor: "#f59e0b" }]} />
              <View style={[S.iconWrap, { backgroundColor: "#fff7ed" }]}>
                <Ionicons name="alert-circle-outline" size={22} color="#f59e0b" />
              </View>
              <View style={S.cardBody}>
                <Text style={S.cardTitle}>Scam Trends</Text>
                <Text style={S.cardSub}>See what’s spiking across regions and categories.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.sub} />
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 24 },

  title: { fontSize: 24, fontWeight: "800", color: C.text, marginBottom: 12 },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#e0e7ff",
    borderColor: "#c7d2fe",
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  bannerText: { color: C.primaryDark, fontWeight: "700", flex: 1 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.cardBg,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
    overflow: "hidden",
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
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: C.text },
  cardSub: { fontSize: 13, color: C.sub, marginTop: 2 },
});
