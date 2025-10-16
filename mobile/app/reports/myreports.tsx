import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../src/firebase";

const API_BASE_URL = "https://reports-bcvrqgcc6a-as.a.run.app";

/* ---------------- Theme ---------------- */
const C = {
  bg: "#ffffff",
  text: "#0f172a",
  sub: "#64748b",
  line: "#e6eaf0",
  cardBg: "rgba(248, 250, 252, 0.92)",
  primary: "#2563eb",
  primaryDark: "#1e40af",
  okBg: "#dcfce7",
  okText: "#166534",
  warnBg: "#fff7ed",
  warnText: "#9a3412",
  errBg: "#fee2e2",
  errText: "#991b1b",
  blue50: "#eff6ff",
  blue100: "#dbeafe",
};

/* -------------- Helpers --------------- */
function safeMs(iso?: string) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}
function relativeTime(iso?: string) {
  const t = safeMs(iso);
  if (!t) return "";
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
}

function statusMeta(status: string) {
  switch ((status || "").toLowerCase()) {
    case "verified":
      return { accent: "#22c55e", chipBg: C.okBg, chipText: C.okText, icon: "checkmark-circle" as const, label: "Verified" };
    case "pending":
      return { accent: "#f59e0b", chipBg: C.warnBg, chipText: C.warnText, icon: "time" as const, label: "Pending" };
    case "declined":
    case "denied":
      return { accent: "#ef4444", chipBg: C.errBg, chipText: C.errText, icon: "close-circle" as const, label: "Declined" };
    default:
      return { accent: C.primary, chipBg: C.blue100, chipText: C.primaryDark, icon: "information-circle" as const, label: "Info" };
  }
}

type Report = {
  id: string;
  message?: string;
  category?: string;
  region?: string;
  status: "pending" | "verified" | "declined" | string;
  updatedAt?: string;
  createdAt?: string;
  feedback?: string;
};

export default function UserReport() {
  const [rawReports, setRawReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "declined">("all");

  const fetchReports = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.reports)) {
        setRawReports(data.reports as Report[]);
      } else {
        console.warn("⚠️ Failed to fetch reports:", data?.error);
      }
    } catch (err) {
      console.error("❌ Error fetching reports:", err);
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const counts = useMemo(() => {
    const all = rawReports.length;
    const pending = rawReports.filter((r) => r.status === "pending").length;
    const verified = rawReports.filter((r) => r.status === "verified").length;
    const declined = rawReports.filter((r) => r.status === "declined").length;
    return { all, pending, verified, declined };
  }, [rawReports]);

  const reports = useMemo(() => {
    let list = [...rawReports];
    if (filter !== "all") list = list.filter((r) => r.status === filter);
    list.sort((a, b) =>
      sortOrder === "newest"
        ? safeMs(b.createdAt) - safeMs(a.createdAt)
        : safeMs(a.createdAt) - safeMs(b.createdAt)
    );
    return list;
  }, [rawReports, filter, sortOrder]);

  const renderItem = ({ item }: { item: Report }) => {
    const meta = statusMeta(item.status);
    return (
      <Pressable style={({ pressed }) => [S.card, pressed && { opacity: 0.97 }]}>
        <View style={[S.cardAccent, { backgroundColor: meta.accent }]} />
        <View style={S.cardTop}>
          <View style={S.iconWrap}>
            <Ionicons name="document-text-outline" size={18} color={C.primary} />
          </View>
          <Text style={S.message} numberOfLines={3}>
            {item.message || "(no message provided)"}
          </Text>
        </View>

        <View style={S.metaRow}>
          <Text style={S.pill}>{item.category || "—"}</Text>
          <Text style={S.pill}>{item.region || "—"}</Text>
        </View>

        <View style={S.bottomRow}>
          <View style={[S.badge, { backgroundColor: meta.chipBg }]}>
            <Ionicons name={meta.icon} size={14} color={meta.chipText} />
            <Text style={[S.badgeText, { color: meta.chipText }]}>{meta.label.toUpperCase()}</Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            {!!item.updatedAt && <Text style={S.date}>Updated: {relativeTime(item.updatedAt)}</Text>}
            {!!item.createdAt && <Text style={S.date}>Submitted: {relativeTime(item.createdAt)}</Text>}
          </View>
        </View>

        {!!item.feedback && (
          <View style={S.feedbackBox}>
            <Text style={S.feedbackLabel}>Admin Feedback</Text>
            <Text style={S.feedbackText}>{item.feedback}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const keyExtractor = (item: Report) => item.id;

  return (
    <SafeAreaView style={S.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={S.container}>
        {/* Header */}
        <View style={S.headerRow}>
          <Text style={S.heading}>Your Reports</Text>

          {/* Sort toggle */}
          <View style={S.sortWrap}>
            <TouchableOpacity
              onPress={() => setSortOrder("newest")}
              style={[S.sortBtn, sortOrder === "newest" && S.sortBtnActive]}
            >
              <Ionicons name="arrow-up" size={14} color={sortOrder === "newest" ? C.primaryDark : C.sub} />
              <Text style={[S.sortTxt, sortOrder === "newest" && S.sortTxtActive]}>Newest</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSortOrder("oldest")}
              style={[S.sortBtn, sortOrder === "oldest" && S.sortBtnActive]}
            >
              <Ionicons name="arrow-down" size={14} color={sortOrder === "oldest" ? C.primaryDark : C.sub} />
              <Text style={[S.sortTxt, sortOrder === "oldest" && S.sortTxtActive]}>Oldest</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter segmented control */}
        <View style={S.filters}>
          {([
            { key: "all", count: counts.all, label: "All" },
            { key: "pending", count: counts.pending, label: "Pending" },
            { key: "verified", count: counts.verified, label: "Verified" },
            { key: "declined", count: counts.declined, label: "Declined" },
          ] as const).map(({ key, count, label }) => {
            const active = filter === key;
            return (
              <Pressable
                key={key}
                onPress={() => setFilter(key)}
                android_ripple={{ color: C.blue100 }}
                style={({ pressed }) => [S.filterBtn, active && S.filterBtnActive, pressed && { opacity: 0.95 }]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[S.filterTxt, active && S.filterTxtActive]}>{label}</Text>
                <View style={[S.countBadge, active && S.countBadgeActive]}>
                  <Text style={[S.countBadgeText, active && S.countBadgeTextActive]}>{count}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Content */}
        {firstLoad ? (
          <View style={{ gap: 10 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : reports.length === 0 && !loading ? (
          <View style={S.emptyWrap}>
            <View style={S.emptyIcon}>
              <Ionicons name="document-outline" size={24} color={C.sub} />
            </View>
            <Text style={S.emptyText}>No reports found.</Text>
          </View>
        ) : (
          <FlatList
            data={reports}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 16 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchReports} />}
            initialNumToRender={8}
            windowSize={7}
          />
        )}

        {loading && !firstLoad && (
          <ActivityIndicator color={C.primary} style={{ position: "absolute", top: 8, right: 12 }} />
        )}
      </View>
    </SafeAreaView>
  );
}

/* ---------------- UI bits ---------------- */
function SkeletonCard() {
  return (
    <View style={[S.card, { backgroundColor: C.blue50, borderColor: C.blue100 }]}>
      <View style={S.cardTop}>
        <View style={S.iconWrap} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ height: 12, width: "70%", borderRadius: 6, backgroundColor: C.blue100 }} />
          <View style={{ height: 10, width: "45%", borderRadius: 6, backgroundColor: C.blue100 }} />
        </View>
      </View>
      <View style={{ height: 10, width: "35%", borderRadius: 6, backgroundColor: C.blue100, marginTop: 8 }} />
    </View>
  );
}

/* ---------------- Styles ---------------- */
const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, padding: 16 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  heading: { fontSize: 22, fontWeight: "800", color: C.text },

  sortWrap: { flexDirection: "row", gap: 8 },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#eef2ff",
  },
  sortBtnActive: { backgroundColor: "#e0e7ff", borderWidth: StyleSheet.hairlineWidth, borderColor: C.primary },
  sortTxt: { fontSize: 12, color: C.sub, fontWeight: "700" },
  sortTxtActive: { color: C.primaryDark },

  filters: {
    flexDirection: "row",
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    padding: 6,
    gap: 6,
    marginBottom: 12,
  },
  filterBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 10,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  filterBtnActive: { backgroundColor: C.blue50, borderColor: C.blue100 },
  filterTxt: { fontSize: 13, color: C.sub, fontWeight: "800" },
  filterTxtActive: { color: C.primaryDark },
  countBadge: {
    minWidth: 22,
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 9,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeActive: { backgroundColor: C.blue100 },
  countBadgeText: { fontSize: 12, fontWeight: "800", color: "#475569" },
  countBadgeTextActive: { color: C.primaryDark },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 14,
    marginBottom: 12,
    gap: 10,
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    overflow: "hidden",
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },

  iconWrap: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: C.blue50, borderWidth: 1, borderColor: C.blue100,
  },

  message: { fontSize: 16, color: C.text, fontWeight: "800", flex: 1 },

  metaRow: { flexDirection: "row", gap: 8 },
  pill: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f1f5f9",
    color: C.text,
    borderRadius: 999,
    overflow: "hidden",
    fontWeight: "700",
  },

  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: "800" },

  date: { fontSize: 12, color: C.sub, textAlign: "right" },

  feedbackBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.cardBg,
    padding: 10,
    gap: 4,
  },
  feedbackLabel: { fontSize: 11, color: C.sub, fontWeight: "800", textTransform: "uppercase" },
  feedbackText: { fontSize: 14, color: C.text },

  emptyWrap: { alignItems: "center", marginTop: 32, gap: 10 },
  emptyIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.blue50, borderWidth: 1, borderColor: C.blue100,
    alignItems: "center", justifyContent: "center",
  },
  emptyText: { color: C.sub, fontSize: 14, fontWeight: "700" },
});
