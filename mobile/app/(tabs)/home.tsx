// mobile/app/(tabs)/home.tsx
import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { auth } from "../../src/firebase";

const API_BASE_URL = "https://analytics-bcvrqgcc6a-as.a.run.app";

type Stats = {
  verified: number;
  pending: number;
  popular: string;
  today: number;
};

export default function Home() {
  const [stats, setStats] = useState<Stats>({ verified: 0, pending: 0, popular: "—", today: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/summary`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data?.ok && data?.data) {
        setStats({
          verified: data.data.verified ?? 0,
          pending: data.data.pending ?? 0,
          popular: data.data.popularCategory ?? "—",
          today: data.data.userReportsToday ?? 0,
        });
      }
    } catch (e) {
      console.error("❌ Stats fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  return (
    <SafeAreaView style={S.safeArea}>
      <ScrollView
        contentContainerStyle={S.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Brand banner (no logo) */}
        <View style={S.banner}>
          <Text style={S.brand}>ScamHuntPH</Text>
          <Text style={S.tagline}>
            Awareness is Protection.{"\n"}Reporting is Power.{"\n"}Always Stay Protected.
          </Text>
        </View>

        {/* This Week */}
        <Section title="This Week">
          <View style={S.grid2}>
            {loading ? <SkeletonCard /> : <StatCard label="Trending Scam Category" value={stats.popular} />}
            {loading ? <SkeletonCard /> : <StatCard label="Your Verified Reports" value={stats.verified} />}
          </View>
          <View style={S.grid2}>
            {loading ? <SkeletonCard /> : <StatCard label="Your Reports Today" value={stats.today} />}
            {loading ? <SkeletonCard /> : <StatCard label="Your Pending Reports" value={stats.pending} />}
          </View>
        </Section>

        {/* General */}
        <Section title="General">
          <View style={S.grid2}>
            <Link href="/report" asChild>
              <QuickAction emoji="📝" label="Report a Scam" />
            </Link>
            <Link href="/learn" asChild>
              <QuickAction emoji="📘" label="Learn Scam" />
            </Link>
          </View>
          <View style={S.grid2}>
            <Link href="/reports/myreports" asChild>
              <QuickAction emoji="📄" label="My Reports" />
            </Link>
            <TouchableOpacity activeOpacity={0.88} style={S.quick}>
              <Text style={S.emoji}>🔍</Text>
              <Text style={S.quickLabel}>Browse Public Reports</Text>
            </TouchableOpacity>
          </View>
        </Section>
      </ScrollView>

      {loading && refreshing && (
        <ActivityIndicator size="small" color={C.primary} style={{ position: "absolute", top: 12, right: 12 }} />
      )}
    </SafeAreaView>
  );
}

/* ---------- UI bits ---------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={S.section}>
      <Text style={S.sectionHeading}>{title}</Text>
      {children}
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={S.card}>
      <Text style={S.cardLabel} numberOfLines={2}>{label}</Text>
      <Text style={S.cardValue}>{String(value)}</Text>
      <View style={S.cardAccent} />
    </View>
  );
}

function SkeletonCard() {
  return (
    <View style={[S.card, S.skeleton]}>
      <View style={S.skelLineShort} />
      <View style={S.skelLineTall} />
    </View>
  );
}

function QuickAction({ emoji, label }: { emoji: string; label: string }) {
  return (
    <TouchableOpacity activeOpacity={0.88} style={S.quick} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={S.emoji}>{emoji}</Text>
      <Text style={S.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ---------- Theme & Styles ---------- */
const C = {
  bg: "#ffffff",
  text: "#0f172a",
  sub: "#64748b",
  line: "#e5e7eb",
  cardBg: "#f8fafc",
  primary: "#2563eb",
  primaryDark: "#1e40af",
};

const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 28 },

  banner: {
    alignItems: "center",
    paddingVertical: 22,
    backgroundColor: C.primary,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingHorizontal: 16,
  },
  brand: { fontSize: 28, fontWeight: "800", color: "#fff", letterSpacing: 0.4 },
  tagline: { marginTop: 6, fontSize: 14, lineHeight: 20, color: "#e5edff", textAlign: "center" },

  section: { marginTop: 18, paddingHorizontal: 16 },
  sectionHeading: { fontSize: 18, fontWeight: "800", color: C.text, marginBottom: 12 },

  grid2: { flexDirection: "row", gap: 12, marginBottom: 12 },

  card: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: C.cardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    justifyContent: "space-between",
    minHeight: 88,
    overflow: "hidden",
  },
  cardLabel: { fontSize: 13, color: C.sub },
  cardValue: { fontSize: 24, fontWeight: "800", marginTop: 6, color: C.text },
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

  quick: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
    minHeight: 100,
  },
  emoji: { fontSize: 30, marginBottom: 2 },
  quickLabel: { fontSize: 15, fontWeight: "800", textAlign: "center", color: C.primaryDark },

  /* Skeletons */
  skeleton: { backgroundColor: "#eef2ff" },
  skelLineShort: { height: 10, width: "60%", borderRadius: 6, backgroundColor: "#dbeafe" },
  skelLineTall: { marginTop: 14, height: 26, width: "35%", borderRadius: 8, backgroundColor: "#dbeafe" },
});
