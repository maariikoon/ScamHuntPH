import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  View,
  ActivityIndicator,
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
  line: "#e5e7eb",
  cardBg: "#f8fafc",
  primary: "#2563eb",
  primaryDark: "#1e40af",
  okBg: "#dcfce7",
  okText: "#166534",
  warnBg: "#fff7ed",
  warnText: "#9a3412",
  errBg: "#fee2e2",
  errText: "#991b1b",
};

/* -------------- Helpers --------------- */
function relativeTime(iso?: string) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const s = Math.max(0, Math.floor(diff / 1000));
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
      return { accent: "#22c55e", badgeBg: C.okBg, badgeText: C.okText, icon: "checkmark-circle" as const };
    case "pending":
      return { accent: "#f59e0b", badgeBg: C.warnBg, badgeText: C.warnText, icon: "time" as const };
    case "declined":
    case "denied":
      return { accent: "#ef4444", badgeBg: C.errBg, badgeText: C.errText, icon: "close-circle" as const };
    default:
      return { accent: C.primary, badgeBg: "#e0e7ff", badgeText: C.primaryDark, icon: "information-circle" as const };
  }
}

export default function UserReport() {
  const [rawReports, setRawReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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
      if (data.ok && Array.isArray(data.reports)) {
        setRawReports(data.reports);
      } else {
        console.warn("⚠️ Failed to fetch reports:", data.error);
      }
    } catch (err) {
      console.error("❌ Error fetching reports:", err);
    } finally {
      setLoading(false);
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
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return list;
  }, [rawReports, filter, sortOrder]);

  const renderItem = ({ item }: { item: any }) => {
    const meta = statusMeta(item.status);
    return (
      <View style={S.card}>
        <View style={[S.cardAccent, { backgroundColor: meta.accent }]} />
        <Text style={S.message} numberOfLines={3}>
          {item.message}
        </Text>

        <View style={S.metaRow}>
          <Text style={S.pill}>{item.category || "—"}</Text>
          <Text style={S.pill}>{item.region || "—"}</Text>
        </View>

        <View style={S.bottomRow}>
          <View style={[S.badge, { backgroundColor: meta.badgeBg }]}>
            <Ionicons name={meta.icon} size={14} color={meta.badgeText} />
            <Text style={[S.badgeText, { color: meta.badgeText }]}>
              {String(item.status || "").toUpperCase()}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            {item.updatedAt ? (
              <Text style={S.date}>Updated: {relativeTime(item.updatedAt)}</Text>
            ) : null}
            {item.createdAt ? (
              <Text style={S.date}>Submitted: {relativeTime(item.createdAt)}</Text>
            ) : null}
          </View>
        </View>

        {item.feedback ? (
          <View style={S.feedbackBox}>
            <Text style={S.feedbackLabel}>Admin Feedback</Text>
            <Text style={S.feedbackText}>{item.feedback}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={S.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={S.container}>
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
            { key: "all", count: counts.all },
            { key: "pending", count: counts.pending },
            { key: "verified", count: counts.verified },
            { key: "declined", count: counts.declined },
          ] as const).map(({ key, count }) => {
            const active = filter === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setFilter(key)}
                style={[S.filterBtn, active && S.filterBtnActive]}
              >
                <Text style={[S.filterTxt, active && S.filterTxtActive]}>
                  {key[0].toUpperCase() + key.slice(1)} {count > 0 ? `(${count})` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {reports.length === 0 && !loading ? (
          <View style={S.emptyWrap}>
            <Text style={S.emptyIcon}>📭</Text>
            <Text style={S.emptyText}>No reports found.</Text>
          </View>
        ) : (
          <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 16 }}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={fetchReports} />
            }
          />
        )}

        {loading && (
          <ActivityIndicator color={C.primary} style={{ position: "absolute", top: 8, right: 12 }} />
        )}
      </View>
    </SafeAreaView>
  );
}

/* ---------------- Styles ---------------- */
const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, padding: 16 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    borderRadius: 12,
    padding: 4,
    gap: 6,
    marginBottom: 12,
  },
  filterBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 9 },
  filterBtnActive: { backgroundColor: "#e8eefc" },
  filterTxt: { fontSize: 13, color: C.sub, fontWeight: "700" },
  filterTxtActive: { color: C.primaryDark },

  card: {
    backgroundColor: C.cardBg,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
    overflow: "hidden",
    gap: 8,
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },

  message: { fontSize: 16, color: C.text, fontWeight: "800" },

  metaRow: { flexDirection: "row", gap: 8 },
  pill: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#e2e8f0",
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
    marginTop: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    backgroundColor: "#fff",
    padding: 10,
    gap: 4,
  },
  feedbackLabel: { fontSize: 12, color: C.sub, fontWeight: "800", textTransform: "uppercase" },
  feedbackText: { fontSize: 14, color: C.text },

  emptyWrap: { alignItems: "center", marginTop: 32, gap: 6 },
  emptyIcon: { fontSize: 28 },
  emptyText: { color: C.sub, fontSize: 14, fontWeight: "700" },
});
