import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../src/firebase";

const ANALYTICS_BASE = "https://analytics-bcvrqgcc6a-as.a.run.app";

/* ---------- Theme ---------- */
const C = {
  bg: "#fff",
  text: "#0f172a",
  sub: "#64748b",
  line: "#e6eaf0",
  cardBg: "rgba(248, 250, 252, 0.92)",
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  blue50: "#eff6ff",
  blue100: "#dbeafe",
  ok: "#22c55e",
  warn: "#f59e0b",
};

type SummaryPayload = {
  total?: number;
  verified?: number;
  pending?: number;
  popularCategory?: string;
  userReportsToday?: number;
};

const periodLabel = (d: 7 | 30 | 90, hadDaysParam: boolean) =>
  hadDaysParam ? (d === 7 ? "Past 7 days" : d === 30 ? "Past 30 days" : "Past 90 days") : "Overall";

/* ---------- Helpers ---------- */
const n = (v: any, d = 0) => {
  const num = Number(v);
  return Number.isFinite(num) ? num : d;
};
const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

/* ---------- Screen ---------- */
export default function ScamTrends() {
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<SummaryPayload | null>(null);
  const [usedDaysParam, setUsedDaysParam] = useState<boolean>(false);

  // ensure only latest request updates state
  const reqIdRef = useRef(0);
  const forcedOnce = useRef(false);

  const fetchSummary = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setErr("You must be logged in.");
      setLoading(false);
      setRefreshing(false);
      setFirstLoad(false);
      return;
    }

    const myReqId = ++reqIdRef.current;

    setErr(null);
    if (!refreshing) setLoading(true);

    const call = async (withDays: boolean, forceFreshToken = false) => {
      const token = await user.getIdToken(forceFreshToken);
      const url = withDays ? `${ANALYTICS_BASE}/summary?days=${days}` : `${ANALYTICS_BASE}/summary`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      let body: any = {};
      try {
        body = await res.json();
      } catch {}
      return { ok: res.ok, status: res.status, body };
    };

    try {
      // 1) Try /summary?days=
      let r = await call(true);
      if ((r.status === 401 || r.status === 403) && !forcedOnce.current) {
        forcedOnce.current = true;
        r = await call(true, true);
      }

      const parse = (srcRaw: any): SummaryPayload => {
        const src = srcRaw?.data ?? srcRaw ?? {};
        const verified = n(src.verified);
        const pending = n(src.pending);
        const total = n(src.total ?? src.totalReports, verified + pending);
        return {
          total,
          verified,
          pending,
          popularCategory: String(src.popularCategory ?? src.popular ?? "—"),
          userReportsToday: n(src.userReportsToday),
        };
      };

      if (r.ok && (r.body?.ok || typeof r.body === "object")) {
        const payload = parse(r.body);
        if (reqIdRef.current === myReqId) {
          setUsedDaysParam(true);
          setData(payload);
          setErr(null);
        }
      } else {
        // 2) Fallback to /summary (overall)
        const fb = await call(false);
        if (fb.ok && (fb.body?.ok || typeof fb.body === "object")) {
          const payload = parse(fb.body);
          if (reqIdRef.current === myReqId) {
            setUsedDaysParam(false);
            setData(payload);
            setErr(null);
          }
        } else if (reqIdRef.current === myReqId) {
          setErr(fb.body?.error || "Failed to load trends.");
        }
      }
    } catch {
      if (reqIdRef.current === myReqId) setErr("Failed to load trends.");
    } finally {
      if (reqIdRef.current === myReqId) {
        setLoading(false);
        setRefreshing(false);
        setFirstLoad(false);
      }
    }
  }, [days, refreshing]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSummary();
  }, [fetchSummary]);

  const total = n(data?.total);
  const verified = n(data?.verified);
  const pending = n(data?.pending);
  const verifyRate = pct(verified, total);
  const pendingRate = pct(pending, total);

  const insight = useMemo(() => {
    const parts: string[] = [];
    parts.push(
      verifyRate >= 70
        ? "High verification rate — good reporting quality."
        : "Verification rate is modest — consider nudging users to add screenshots."
    );
    if (data?.popularCategory && data.popularCategory !== "—") {
      parts.push(`Most common category: ${data.popularCategory}.`);
    }
    if (typeof data?.userReportsToday === "number") {
      parts.push(`New today: ${data.userReportsToday}.`);
    }
    return parts.join(" ");
  }, [verifyRate, data?.popularCategory, data?.userReportsToday]);

  return (
    <SafeAreaView style={S.safeArea}>
      <ScrollView
        contentContainerStyle={S.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header + range selector */}
        <View style={S.headerRow}>
          <Text style={S.title}>🚨 Scam Trends</Text>

          <View style={S.rangeWrap}>
            {[7, 30, 90].map((d) => {
              const active = days === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDays(d as 7 | 30 | 90)}
                  android_ripple={{ color: C.blue100 }}
                  style={({ pressed }) => [S.rangeBtn, active && S.rangeBtnActive, pressed && { opacity: 0.95 }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Show ${d} days`}
                >
                  <Text style={[S.rangeText, active && S.rangeTextActive]}>{d}d</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={S.periodText}>{periodLabel(days, usedDaysParam)}</Text>

        {/* States */}
        {firstLoad && loading ? (
          <>
            <SkeletonKpiRow />
            <SkeletonKpiRow />
            <SkeletonWide />
          </>
        ) : err ? (
          <View style={S.center}>
            <Text style={S.error}>{err}</Text>
            <Pressable onPress={fetchSummary} style={S.retryBtn} android_ripple={{ color: C.blue100 }}>
              <Text style={S.retryTxt}>Try again</Text>
            </Pressable>
          </View>
        ) : !data ? (
          <View style={S.center}>
            <Text style={S.empty}>No data yet.</Text>
          </View>
        ) : (
          <>
            {/* KPI grid */}
            <View style={S.kpiGrid}>
              <KPI icon="document-text-outline" label="Total Reports" value={total} />
              <KPI icon="shield-checkmark-outline" label="Verified" value={verified} />
            </View>

            <View style={S.kpiGrid}>
              <KPI icon="time-outline" label="Pending" value={pending} />
              <KPI icon="checkmark-done-outline" label="Verification Rate" value={`${verifyRate}%`} />
            </View>

            {/* Progress tiny bars */}
            <View style={S.progress}>
              <Text style={S.progressTitle}>Distribution</Text>
              <View style={S.barBg}>
                <View style={[S.barSeg, { flex: verified || 0, backgroundColor: C.ok }]} />
                <View style={[S.barSeg, { flex: pending || 0, backgroundColor: C.warn }]} />
                <View style={[S.barSeg, { flex: Math.max(total - verified - pending, 0), backgroundColor: C.blue50 }]} />
              </View>
              <View style={S.legendRow}>
                <LegendDot color={C.ok} label={`Verified ${verifyRate}%`} />
                <LegendDot color={C.warn} label={`Pending ${pendingRate}%`} />
                <LegendDot color={C.blue50} label={`Other ${Math.max(100 - verifyRate - pendingRate, 0)}%`} />
              </View>
            </View>

            {/* Top category */}
            <View style={S.kpiWide}>
              <Ionicons name="pricetag-outline" size={18} color={C.primaryDark} />
              <Text style={S.kpiWideLabel}>Top Category</Text>
              <Text style={S.kpiWideValue}>{data.popularCategory || "—"}</Text>
            </View>

            {/* Insights */}
            <View style={S.section}>
              <Text style={S.sectionTitle}>Insights</Text>
              <Text style={S.insight}>{insight}</Text>
            </View>
          </>
        )}

        {!firstLoad && loading && <ActivityIndicator color={C.primary} style={{ marginTop: 16 }} />}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Small UI bits ---------- */
function KPI({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string | number }) {
  return (
    <View style={S.kpi}>
      <View style={S.kpiIcon}>
        <Ionicons name={icon} size={18} color={C.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={S.kpiLabel}>{label}</Text>
        <Text style={S.kpiValue}>{String(value)}</Text>
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={S.legendItem}>
      <View style={[S.legendDot, { backgroundColor: color }]} />
      <Text style={S.legendText}>{label}</Text>
    </View>
  );
}

/* ---------- Skeletons ---------- */
function SkeletonKpiRow() {
  return (
    <View style={S.kpiGrid}>
      <View style={[S.kpi, { backgroundColor: C.blue50, borderColor: C.blue100 }]}>
        <View style={[S.kpiIcon, { backgroundColor: C.blue100 }]} />
        <View style={{ gap: 8 }}>
          <View style={{ height: 10, width: 90, borderRadius: 6, backgroundColor: C.blue100 }} />
          <View style={{ height: 16, width: 60, borderRadius: 6, backgroundColor: C.blue100 }} />
        </View>
      </View>
      <View style={[S.kpi, { backgroundColor: C.blue50, borderColor: C.blue100 }]}>
        <View style={[S.kpiIcon, { backgroundColor: C.blue100 }]} />
        <View style={{ gap: 8 }}>
          <View style={{ height: 10, width: 90, borderRadius: 6, backgroundColor: C.blue100 }} />
          <View style={{ height: 16, width: 60, borderRadius: 6, backgroundColor: C.blue100 }} />
        </View>
      </View>
    </View>
  );
}

function SkeletonWide() {
  return (
    <View style={[S.kpiWide, { backgroundColor: C.blue50, borderColor: C.blue100, marginTop: 12 }]}>
      <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: C.blue100 }} />
      <View style={{ height: 12, width: 110, borderRadius: 6, backgroundColor: C.blue100 }} />
      <View style={{ marginLeft: "auto", height: 14, width: 80, borderRadius: 6, backgroundColor: C.blue100 }} />
    </View>
  );
}

/* ---------- Styles ---------- */
const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 32 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "800", color: C.text },

  rangeWrap: {
    flexDirection: "row",
    backgroundColor: C.cardBg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    padding: 4,
    gap: 6,
  },
  rangeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  rangeBtnActive: { backgroundColor: C.blue50, borderColor: C.blue100 },
  rangeText: { color: C.sub, fontWeight: "800", fontSize: 12 },
  rangeTextActive: { color: C.primaryDark },

  periodText: { marginTop: 6, color: C.sub, fontWeight: "600" },

  center: { alignItems: "center", marginTop: 24, gap: 10 },
  error: { color: "#ef4444", fontWeight: "700", textAlign: "center" },
  retryBtn: { backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  retryTxt: { color: "#fff", fontWeight: "800" },
  empty: { color: C.sub },

  /* KPI cards */
  kpiGrid: { flexDirection: "row", gap: 12, marginTop: 14 },
  kpi: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  kpiIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.blue50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.blue100,
  },
  kpiLabel: { color: C.sub, fontSize: 12, fontWeight: "800" },
  kpiValue: { color: C.text, fontSize: 22, fontWeight: "800" },

  /* Distribution progress */
  progress: { marginTop: 12, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14 },
  progressTitle: { color: C.sub, fontSize: 12, fontWeight: "800", marginBottom: 8 },
  barBg: { flexDirection: "row", height: 10, borderRadius: 999, overflow: "hidden", backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.line },
  barSeg: { height: "100%" },
  legendRow: { flexDirection: "row", gap: 14, marginTop: 8, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.blue50, borderWidth: 1, borderColor: C.line },
  legendText: { fontSize: 12, color: C.text, fontWeight: "700" },

  /* Top category */
  kpiWide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  kpiWideLabel: { color: C.sub, fontWeight: "800" },
  kpiWideValue: { marginLeft: "auto", fontWeight: "800", color: C.text },

  /* Section */
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: C.text, marginBottom: 8 },
  insight: { color: C.text, lineHeight: 22 },
});
