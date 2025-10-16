// app/public-reports/public-reports.tsx
import React, { useCallback, useEffect, useState, useMemo } from "react";
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

/* ---------- Theme ---------- */
const C = {
  bg: "#ffffff",
  text: "#0f172a",
  sub: "#64748b",
  line: "#e6eaf0",
  cardBg: "rgba(248, 250, 252, 0.92)",
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  blue50: "#eff6ff",
  blue100: "#dbeafe",
};

/* ---------- Types ---------- */
type Report = {
  id: string;
  message: string;
  category?: string;
  region?: string;
  createdAt?: string; // ISO
};

/* ---------- Helpers ---------- */
const relative = (iso?: string) => {
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
  return new Date(t).toLocaleDateString();
};

export default function PublicReports() {
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [category, setCategory] = useState<string>("All");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setErr(null);
    if (!refreshing) setLoading(true);

    try {
      let url = `${API_BASE_URL}?days=${days}`;
      if (category !== "All") url += `&category=${encodeURIComponent(category)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load reports");

      setReports((json.data || []) as Report[]);
    } catch (e: any) {
      setErr(e?.message || "Failed to load reports");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setFirstLoad(false);
    }
  }, [days, category, refreshing]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const headerCount = useMemo(() => reports.length, [reports]);

  return (
    <SafeAreaView style={S.safeArea}>
      <ScrollView
        contentContainerStyle={S.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={S.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={S.title}>Public Reports</Text>
            <Text style={S.subtitle}>Community-submitted, team-verified messages.</Text>
          </View>
          <View style={S.countPill}>
            <Ionicons name="list-outline" size={14} color={C.primaryDark} />
            <Text style={S.countPillText}>{headerCount}</Text>
          </View>
        </View>

        {/* Range chips */}
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
          <Picker selectedValue={category} onValueChange={(v) => setCategory(String(v))} style={S.picker}>
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
        {firstLoad && loading ? (
          <View style={{ gap: 10 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : err ? (
          <View style={S.center}>
            <View style={S.emptyIcon}>
              <Ionicons name="alert-circle-outline" size={24} color={C.sub} />
            </View>
            <Text style={S.error}>{err}</Text>
          </View>
        ) : reports.length === 0 ? (
          <View style={S.center}>
            <View style={S.emptyIcon}>
              <Ionicons name="documents-outline" size={24} color={C.sub} />
            </View>
            <Text style={S.empty}>No verified reports found.</Text>
          </View>
        ) : (
          reports.map((r) => (
            <View key={r.id} style={S.card}>
              <View style={S.cardTop}>
                <View style={S.iconWrap}>
                  <Ionicons name="document-text-outline" size={18} color={C.primary} />
                </View>
                <Text style={S.msg} numberOfLines={4}>
                  {r.message}
                </Text>
              </View>

              <View style={S.metaRow}>
                <View style={S.pill}>
                  <Ionicons name="pricetag-outline" size={12} color={C.primaryDark} />
                  <Text style={S.pillText}>{r.category || "Other"}</Text>
                </View>
                <View style={S.pill}>
                  <Ionicons name="location-outline" size={12} color={C.primaryDark} />
                  <Text style={S.pillText}>{r.region || "—"}</Text>
                </View>
                <View style={S.dateRow}>
                  <Ionicons name="time-outline" size={12} color={C.sub} />
                  <Text style={S.dateText}>{relative(r.createdAt)}</Text>
                </View>
              </View>
            </View>
          ))
        )}

        {!firstLoad && loading && (
          <ActivityIndicator color={C.primary} style={{ marginTop: 12 }} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Skeleton ---------- */
function SkeletonCard() {
  return (
    <View style={[S.card, { backgroundColor: C.blue50, borderColor: C.blue100 }]}>
      <View style={S.cardTop}>
        <View style={S.iconWrap} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ height: 12, width: "80%", borderRadius: 6, backgroundColor: C.blue100 }} />
          <View style={{ height: 12, width: "60%", borderRadius: 6, backgroundColor: C.blue100 }} />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <View style={{ height: 18, width: 110, borderRadius: 999, backgroundColor: C.blue100 }} />
        <View style={{ height: 18, width: 90, borderRadius: 999, backgroundColor: C.blue100 }} />
      </View>
    </View>
  );
}

/* ---------- Styles ---------- */
const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 32 },

  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  title: { fontSize: 24, fontWeight: "800", color: C.text, marginBottom: 2 },
  subtitle: { color: C.sub },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.blue50,
    borderWidth: 1,
    borderColor: C.blue100,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: 8,
  },
  countPillText: { color: C.primaryDark, fontWeight: "800" },

  rangeWrap: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
    marginBottom: 14,
    backgroundColor: C.cardBg,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: C.line,
    alignSelf: "flex-start",
  },
  rangeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  rangeBtnActive: { backgroundColor: C.blue50, borderColor: C.blue100 },
  rangeText: { color: C.sub, fontWeight: "800" },
  rangeTextActive: { color: C.primaryDark },

  label: { fontSize: 16, fontWeight: "800", color: C.text, marginBottom: 8 },

  selectWrap: {
    position: "relative",
    backgroundColor: C.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    marginBottom: 16,
    overflow: "hidden",
  },
  selectIcon: {
    position: "absolute",
    right: 10,
    top: Platform.select({ ios: 14, android: 18 }) as number,
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
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    overflow: "hidden",
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: C.blue50, borderWidth: 1, borderColor: C.blue100,
  },
  msg: { fontSize: 16, color: C.text, flex: 1 },

  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pillText: { fontSize: 12, color: C.text, fontWeight: "700" },

  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText: { fontSize: 12, color: C.sub },

  center: { alignItems: "center", gap: 10, marginTop: 20 },
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
  error: { color: "#ef4444", fontWeight: "700", textAlign: "center" },
  empty: { color: C.sub, textAlign: "center" },
});
