// app/public-reports/public-reports.tsx  <-- first public-reports is a folder
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

const API_BASE_URL = "https://publicreports-bcvrqgcc6a-as.a.run.app";

const C = {
  bg: "#fff",
  text: "#0f172a",
  sub: "#64748b",
  line: "#e5e7eb",
  cardBg: "#f8fafc",
  primary: "#2563eb",
  primaryDark: "#1e40af",
};

type Report = {
  id: string;
  message: string;
  category?: string;
  region?: string;
  createdAt?: string;
};

export default function PublicReports() {
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [category, setCategory] = useState<string>("All");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setErr(null);
    if (!refreshing) setLoading(true);

    try {
      let url = `${API_BASE_URL}?days=${days}`;
      if (category !== "All") {
        url += `&category=${encodeURIComponent(category)}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load reports");

      setReports(json.data || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days, category, refreshing]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  return (
    <SafeAreaView style={S.safeArea}>
      <ScrollView
        contentContainerStyle={S.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <Text style={S.title}>📂 Public Reports</Text>
        <Text style={S.subtitle}>
          Explore a community-submitted archive of scam messages verified by our team.
        </Text>

        {/* Filter bar */}
        <View style={S.rangeWrap}>
          {[7, 30, 90].map((d) => {
            const active = days === d;
            return (
              <TouchableOpacity
                key={d}
                onPress={() => setDays(d as 7 | 30 | 90)}
                style={[S.rangeBtn, active && S.rangeBtnActive]}
              >
                <Text style={[S.rangeText, active && S.rangeTextActive]}>{d}d</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Category dropdown */}
        <Text style={S.label}>Filter by Category</Text>
        <View style={S.selectWrap}>
          <Picker selectedValue={category} onValueChange={setCategory} style={S.picker}>
            <Picker.Item label="All Categories" value="All" />
            <Picker.Item label="Phishing/Smishing" value="Phishing/Smishing" />
            <Picker.Item label="Delivery Fraud" value="Delivery Fraud" />
            <Picker.Item label="Fake Job" value="Fake Job" />
            <Picker.Item label="Loan Scam" value="Loan Scam" />
            <Picker.Item label="Investment Scam" value="Investment Scam" />
            <Picker.Item label="Gcash Scam" value="Gcash Scam" />
            <Picker.Item label="Identity theft" value="Identity theft" />
            <Picker.Item label="Lottery Scams" value="Lottery Scams" />
            <Picker.Item label="Others" value="Others" />
          </Picker>
          <Ionicons name="chevron-down" size={18} color={C.sub} style={S.selectIcon} />
        </View>

        {/* Results */}
        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
        ) : err ? (
          <Text style={S.error}>{err}</Text>
        ) : reports.length === 0 ? (
          <Text style={S.empty}>No verified reports found.</Text>
        ) : (
          reports.map((r) => (
            <View key={r.id} style={S.card}>
              <Text style={S.msg}>{r.message}</Text>
              <View style={S.metaRow}>
                <Ionicons name="pricetag-outline" size={14} color={C.sub} />
                <Text style={S.meta}>{r.category || "Other"}</Text>
                <Ionicons name="location-outline" size={14} color={C.sub} style={{ marginLeft: 10 }} />
                <Text style={S.meta}>{r.region || "—"}</Text>
                <Ionicons name="time-outline" size={14} color={C.sub} style={{ marginLeft: 10 }} />
                <Text style={S.meta}>{r.createdAt?.slice(0, 10) || ""}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: "800", color: C.text, marginBottom: 4 },
  subtitle: { color: C.sub, marginBottom: 12 },
  rangeWrap: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
    backgroundColor: C.cardBg,
    borderRadius: 999,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    alignSelf: "flex-start",
  },
  rangeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  rangeBtnActive: { backgroundColor: "#e0e7ff" },
  rangeText: { color: C.sub, fontWeight: "800" },
  rangeTextActive: { color: C.primaryDark },
  label: { fontSize: 16, fontWeight: "800", color: C.text, marginBottom: 8 },
  selectWrap: {
    position: "relative",
    backgroundColor: C.cardBg,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    marginBottom: 14,
    overflow: "hidden",
  },
  selectIcon: {
    position: "absolute",
    right: 10,
    top: Platform.OS === "ios" ? 14 : 18,
    pointerEvents: "none",
  },
  picker: {
    width: "100%",
    color: C.text,
    ...(Platform.OS === "ios"
      ? { height: 44, paddingHorizontal: 10 }
      : { height: 50, paddingHorizontal: 6 }),
  },
  card: {
    backgroundColor: C.cardBg,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: 14,
    marginBottom: 12,
  },
  msg: { fontSize: 16, color: C.text, marginBottom: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 2 },
  meta: { fontSize: 12, color: C.sub, marginLeft: 2 },
  error: { color: "#ef4444", fontWeight: "700", marginTop: 20 },
  empty: { color: C.sub, marginTop: 20 },
});
