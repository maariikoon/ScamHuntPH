import { useEffect, useState, useCallback, useRef, forwardRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Pressable,
  Animated,
} from "react-native";
import type { PressableProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { auth } from "../../src/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next"; // 👈 added

const API_BASE_URL = "https://analytics-bcvrqgcc6a-as.a.run.app";

/* ---------- Types ---------- */
type Stats = {
  verified: number;
  pending: number;
  popular: string;
  today: number;
};

/* ---------- Theme (matched to your screenshot blues) ---------- */
const C = {
  bg: "#ffffff",
  text: "#0f172a",
  sub: "#5b6472",
  line: "#e6eaf0",

  blue50:  "#eff6ff",
  blue100: "#dbeafe",
  blue200: "#bfdbfe",
  blue300: "#93c5fd",
  blue400: "#60a5fa",
  blue500: "#3b82f6",
  blue600: "#2563eb",
  blue700: "#1d4ed8",

  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  cardBg: "rgba(248, 250, 252, 0.92)",
};

/* ---------- Helpers ---------- */
function useScaleOnPress() {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, friction: 6, tension: 150 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 150 }).start();
  return { scale, onPressIn, onPressOut };
}

/* ---------- Screen ---------- */
export default function Home() {
  const { t } = useTranslation("common"); // 👈 added (use your defaultNS if different)

  const [stats, setStats] = useState<Stats>({ verified: 0, pending: 0, popular: "—", today: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
        {/* Banner */}
        <View style={S.bannerWrap}>
          <LinearGradient
            colors={[C.blue600, C.blue500]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={S.banner}
          >
            <Text style={S.brand}>
              {t("home.banner.brand", { defaultValue: "ScamHuntPH" })}
            </Text>
            <Text style={S.tagline}>
              {t("home.banner.tagline", {
                defaultValue:
                  "Awareness is Protection.\nReporting is Power.\nAlways Stay Protected.",
              })}
            </Text>

            <LinearGradient
              colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={S.bannerSheen}
            />
          </LinearGradient>
        </View>

        {/* This Week */}
        <Section title={t("home.section.thisWeek", { defaultValue: "This Week" })}>
          <View style={S.grid2}>
            {loading ? (
              <SkeletonCard />
            ) : (
              <StatCard
                label={t("home.stats.trending", { defaultValue: "Trending Scam Category" })}
                value={stats.popular}
                icon={<MaterialCommunityIcons name="chart-timeline-variant" size={22} color={C.primary} />}
              />
            )}
            {loading ? (
              <SkeletonCard />
            ) : (
              <StatCard
                label={t("home.stats.verified", { defaultValue: "Your Verified Reports" })}
                value={stats.verified}
                icon={<Ionicons name="checkmark-circle" size={22} color={C.primary} />}
              />
            )}
          </View>

          <View style={S.grid2}>
            {loading ? (
              <SkeletonCard />
            ) : (
              <StatCard
                label={t("home.stats.today", { defaultValue: "Your Reports Today" })}
                value={stats.today}
                icon={<Ionicons name="today" size={22} color={C.primary} />}
              />
            )}
            {loading ? (
              <SkeletonCard />
            ) : (
              <StatCard
                label={t("home.stats.pending", { defaultValue: "Your Pending Reports" })}
                value={stats.pending}
                icon={<Ionicons name="time-outline" size={22} color={C.primary} />}
              />
            )}
          </View>
        </Section>

        {/* General */}
        <Section title={t("home.section.general", { defaultValue: "General" })}>
          <View style={S.grid2}>
            <Link href="/report" asChild>
              <QuickAction
                label={t("home.actions.report", { defaultValue: "Report a Scam" })}
                icon={<Ionicons name="create-outline" size={26} color={C.primaryDark} />}
              />
            </Link>
            <Link href="/learn" asChild>
              <QuickAction
                label={t("home.actions.learn", { defaultValue: "Learn Scam" })}
                icon={<Ionicons name="book-outline" size={26} color={C.primaryDark} />}
              />
            </Link>
          </View>
          <View style={S.grid2}>
            <Link href="/reports/myreports" asChild>
              <QuickAction
                label={t("home.actions.myReports", { defaultValue: "My Reports" })}
                icon={<Ionicons name="document-text-outline" size={26} color={C.primaryDark} />}
              />
            </Link>
            <Link href="/public-reports/public-reports" asChild>
              <QuickAction
                label={t("home.actions.publicReports", { defaultValue: "Public Reports" })}
                icon={<Ionicons name="search-outline" size={26} color={C.primaryDark} />}
              />
            </Link>
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

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  const { scale, onPressIn, onPressOut } = useScaleOnPress();

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        android_ripple={{ color: C.blue100 }}
        style={S.card}
      >
        <LinearGradient
          colors={[C.blue400, C.blue600]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={S.cardEdge}
        />
        <View style={S.cardHeader}>
          {icon}
          <Text style={S.cardLabel} numberOfLines={2}>{label}</Text>
        </View>
        <Text style={S.cardValue}>{String(value)}</Text>
      </Pressable>
    </Animated.View>
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

/** Fully clickable tile that works with <Link asChild> */
type QuickActionProps = { label: string; icon: React.ReactNode } & PressableProps;

const QuickAction = forwardRef<View, QuickActionProps>(function QuickAction(
  { label, icon, ...pressableProps },
  ref
) {
  const { scale, onPressIn, onPressOut } = useScaleOnPress();
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <Pressable
        ref={ref}
        {...pressableProps}
        onPressIn={(e) => {
          onPressIn();
          pressableProps.onPressIn?.(e);
        }}
        onPressOut={(e) => {
          onPressOut();
          pressableProps.onPressOut?.(e);
        }}
        android_ripple={{ color: C.blue100 }}
        style={S.quick}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={6}
      >
        <View style={S.quickIconWrap}>{icon}</View>
        <Text style={S.quickLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
});

/* ---------- Styles ---------- */
const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 28 },

  /* Banner */
  bannerWrap: { paddingHorizontal: 16, paddingTop: 6 },
  banner: {
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 18,
    overflow: "hidden",
  },
  brand: { fontSize: 28, fontWeight: "800", color: "#fff", letterSpacing: 0.4, textAlign: "center" },
  tagline: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#eaf2ff",
    textAlign: "center",
  },
  bannerSheen: {
    position: "absolute",
    top: -20,
    left: -40,
    right: -40,
    height: 80,
    transform: [{ rotate: "12deg" }],
  },

  /* Sections */
  section: { marginTop: 18, paddingHorizontal: 16 },
  sectionHeading: { fontSize: 18, fontWeight: "800", color: C.text, marginBottom: 12 },

  /* Grid */
  grid2: { flexDirection: "row", gap: 12, marginBottom: 12 },

  /* Card */
  card: {
    position: "relative",
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.16)",
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.10 : 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    minHeight: 96,
    justifyContent: "space-between",
  },
  cardEdge: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    opacity: 0.95,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardLabel: { fontSize: 13, color: C.sub, flex: 1 },
  cardValue: { fontSize: 26, fontWeight: "800", marginTop: 6, color: C.text },

  /* Quick actions */
  quick: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    minHeight: 104,
  },
  quickIconWrap: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: C.blue50,
    borderWidth: 1,
    borderColor: C.blue100,
  },
  quickLabel: { fontSize: 15, fontWeight: "800", textAlign: "center", color: C.primaryDark },

  /* Skeletons */
  skeleton: { backgroundColor: C.blue50, borderColor: C.blue100 },
  skelLineShort: { height: 10, width: "58%", borderRadius: 6, backgroundColor: C.blue100 },
  skelLineTall: { marginTop: 14, height: 26, width: "36%", borderRadius: 8, backgroundColor: C.blue200 },
});
