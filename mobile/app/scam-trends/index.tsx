import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
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
  line: "#e5e7eb",
  cardBg: "#f8fafc",
  primary: "#2563eb",
  primaryDark: "#1e40af",
};

/* ---------- Types ---------- */
type SummaryPayload = {
  total?: number;                 // optional from backend
  verified?: number;
  pending?: number;
  popularCategory?: string;
  userReportsToday?: number;
};

const periodLabel = (d: 7 | 30 | 90, hadDaysParam: boolean) =>
  hadDaysParam ? (d === 7 ? "Past 7 days" : d === 30 ? "Past 30 days" : "Past 90 days") : "Overall";

/* ---------- Helpers ---------- */
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

/* ---------- Screen ---------- */
export default function ScamTrends() {
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<SummaryPayload | null>(null);
  const [usedDaysParam, setUsedDaysParam] = useState<boolean>(false);
  const forcedOnce = useRef(false);

  const fetchSummary = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setErr("You must be logged in.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setErr(null);
    if (!refreshing) setLoading(true);

    const call = async (withDays: boolean, forceFreshToken = false) => {
      const token = await user.getIdToken(forceFreshToken);
      const url = withDays
        ? `${ANALYTICS_BASE}/summary?days=${days}`
        : `${ANALYTICS_BASE}/summary`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, body: json };
    };

    try {
      // 1) Try with days filter
      let r = await call(true);
      if (r.status === 401 || r.status === 403) {
        // refresh token once
        if (!forcedOnce.current) {
          forcedOnce.current = true;
          r = await call(true, true);
        }
      }

      if (r.ok && (r.body?.ok || r.body?.data || typeof r.body === "object")) {
        const src = (r.body?.data ?? r.body) as any;
        const payload: SummaryPayload = {
          total:
            Number(src.total ?? src.totalReports) ||
            Number(src.verified ?? 0) + Number(src.pending ?? 0),
          verified: Number(src.verified ?? 0),
          pending: Number(src.pending ?? 0),
          popularCategory: String(src.popularCategory ?? src.popular ?? "—"),
          userReportsToday: Number(src.userReportsToday ?? 0),
        };
        setUsedDaysParam(true);
        setData(payload);
        setErr(null);
      } else {
        // 2) Fallback to /summary without days (overall)
        const fb = await call(false);
        if (fb.ok && (fb.body?.ok || fb.body?.data || typeof fb.body === "object")) {
          const src = (fb.body?.data ?? fb.body) as any;
          const payload: SummaryPayload = {
            total:
              Number(src.total ?? src.totalReports) ||
              Number(src.verified ?? 0) + Number(src.pending ?? 0),
            verified: Number(src.verified ?? 0),
            pending: Number(src.pending ?? 0),
            popularCategory: String(src.popularCategory ?? src.popular ?? "—"),
            userReportsToday: Number(src.userReportsToday ?? 0),
          };
          setUsedDaysParam(false);
          setData(payload);
          setErr(null);
        } else {
          setErr(fb.body?.error || "Failed to load trends.");
        }
      }
    } catch (e) {
      setErr("Failed to load trends.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days, refreshing]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSummary();
  }, [fetchSummary]);

  const total = data?.total ?? 0;
  const verified = data?.verified ?? 0;
  const pending = data?.pending ?? 0;
  const verifyRate = pct(verified, total);

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
        </View>

        <Text style={S.periodText}>{periodLabel(days, usedDaysParam)}</Text>

        {/* States */}
        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 24 }} />
        ) : err ? (
          <View style={S.center}>
            <Text style={S.error}>{err}</Text>
            <TouchableOpacity onPress={fetchSummary} style={S.retryBtn}>
              <Text style={S.retryTxt}>Try again</Text>
            </TouchableOpacity>
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
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Small UI bits ---------- */
function KPI({ icon, label, value }: { icon: any; label: string; value: string | number }) {
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: 4,
    gap: 6,
  },
  rangeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  rangeBtnActive: { backgroundColor: "#e0e7ff" },
  rangeText: { color: C.sub, fontWeight: "800", fontSize: 12 },
  rangeTextActive: { color: C.primaryDark },

  periodText: { marginTop: 6, color: C.sub, fontWeight: "600" },

  center: { alignItems: "center", marginTop: 24, gap: 10 },
  error: { color: "#ef4444", fontWeight: "700" },
  retryBtn: { backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  retryTxt: { color: "#fff", fontWeight: "800" },
  empty: { color: C.sub },

  /* KPI cards */
  kpiGrid: { flexDirection: "row", gap: 12, marginTop: 14 },
  kpi: {
    flex: 1,
    backgroundColor: C.cardBg,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  kpiIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiLabel: { color: C.sub, fontSize: 12, fontWeight: "800" },
  kpiValue: { color: C.text, fontSize: 22, fontWeight: "800" },

  kpiWide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.cardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    borderRadius: 14,
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
