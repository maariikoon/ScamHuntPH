// app/profile/index.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../src/firebase";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { Link, useRouter } from "expo-router";
import LanguagePicker from "../components/LanguagePicker";
; // 👈 add your picker
import { useTranslation } from "react-i18next";               // 👈 i18n hook

const db = getFirestore();
const API_BASE_URL = "https://analytics-bcvrqgcc6a-as.a.run.app";

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
  danger: "#ef4444",
};

export default function Profile() {
  const { t, i18n } = useTranslation(); // default namespace
  const [userData, setUserData] = useState<any>(null);
  const [impact, setImpact] = useState<{ total: number; verified: number }>({
    total: 0,
    verified: 0,
  });
  const [loadingImpact, setLoadingImpact] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const router = useRouter();

  const fetchUserAndImpact = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    // 1) Profile doc
    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      const base = snap.exists() ? snap.data() : { email: user.email };
      setUserData(base);

      // 👇 Auto-apply profile language to i18n (e.g., "en", "tl", "fil")
      if (base?.language && i18n.language !== base.language) {
        await i18n.changeLanguage(base.language);
      }
    } catch {
      setUserData({ email: user.email });
    }

    // 2) Impact metrics
    setLoadingImpact(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const src = json?.data ?? {};
      setImpact({
        total: Number(src.userReportsTotal ?? 0),
        verified: Number(src.userReportsVerified ?? 0),
      });
    } catch {
      // keep previous values
    } finally {
      setLoadingImpact(false);
      setRefreshing(false);
    }
  }, [i18n]);

  useEffect(() => {
    fetchUserAndImpact();
  }, [fetchUserAndImpact]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserAndImpact();
  };

  const name =
    `${userData?.firstName ?? ""} ${userData?.lastName ?? ""}`.trim() ||
    auth.currentUser?.displayName ||
    t("profile.user", "User");
  const email = userData?.email || auth.currentUser?.email || "—";
  const verifyRate = impact.total > 0 ? Math.round((impact.verified / impact.total) * 100) : 0;

  return (
    <SafeAreaView style={S.safeArea}>
      <ScrollView
        contentContainerStyle={S.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Identity */}
        <View style={S.cardCenter}>
          <View style={S.avatarRing}>
            <Ionicons name="person-outline" size={42} color={C.primary} />
          </View>
          <Text style={S.name}>{name}</Text>
          <Text style={S.email}>{email}</Text>
        </View>

        {/* Impact */}
        <View style={S.cardBlock}>
          <View style={S.blockHead}>
            <View style={S.blockIcon}>
              <Ionicons name="trending-up-outline" size={16} color={C.primary} />
            </View>
            <Text style={S.blockTitle}>{t("profile.yourImpact", "Your Impact")}</Text>
          </View>

          {loadingImpact ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 8 }} />
          ) : (
            <>
              <View style={S.kpiRow}>
                <KPI
                  icon="document-text-outline"
                  label={t("profile.reported", "Reported")}
                  value={impact.total}
                />
                <KPI
                  icon="shield-checkmark-outline"
                  label={t("profile.verified", "Verified")}
                  value={impact.verified}
                />
              </View>

              <View style={{ marginTop: 12 }}>
                <View style={S.progressTrack}>
                  <View style={[S.progressFill, { width: `${verifyRate}%` }]} />
                </View>
                <Text style={S.progressText}>
                  {t("profile.verificationRate", "Verification rate")}: {verifyRate}%
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Settings */}
        <Text style={S.sectionHeading}>{t("profile.settings", "Settings")}</Text>

        {/* 👇 Language picker rendered inside Settings */}
        <View style={{ marginBottom: 10 }}>
          <LanguagePicker />
        </View>

        <Link href="/profile/account-settings" asChild>
          <Row icon="person-circle-outline" label={t("profile.accountSettings", "Account Settings")} />
        </Link>

        <Link href="/profile/privacy-security" asChild>
          <Row icon="lock-closed-outline" label={t("profile.privacySecurity", "Privacy and Security")} />
        </Link>

        <Row icon="notifications-outline" label={t("profile.notifications", "Notification Preferences")} />

        <Link href="/reports/myreports" asChild>
          <Row icon="albums-outline" label={t("profile.myReports", "My Reports")} />
        </Link>

        {/* Sign out */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[S.listItem, { borderColor: "#fecaca", backgroundColor: "#fff5f5" }]}
          onPress={() =>
            Alert.alert(
              t("profile.signOutTitle", "Sign Out"),
              t("profile.signOutConfirm", "Are you sure you want to sign out?"),
              [
                { text: t("common.cancel", "Cancel"), style: "cancel" },
                {
                  text: t("profile.signOut", "Sign Out"),
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await auth.signOut();
                      router.replace("/(auth)/login");
                    } catch (err: any) {
                      Alert.alert(t("common.error", "Error"), err.message);
                    }
                  },
                },
              ]
            )
          }
        >
          <View style={S.rowLeft}>
            <Ionicons name="log-out-outline" size={22} color={C.danger} />
            <Text style={[S.listText, { color: C.danger }]}>{t("profile.signOut", "Sign Out")}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Small components ---------- */
function KPI({ icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <View style={S.kpi}>
      <View style={S.kpiIcon}>
        <Ionicons name={icon} size={16} color={C.primaryDark} />
      </View>
      <Text style={S.kpiValue}>{value}</Text>
      <Text style={S.kpiLabel}>{label}</Text>
    </View>
  );
}

function Row({
  icon,
  label,
  onPress,
}: {
  icon: any;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.8} style={S.listItem} onPress={onPress}>
      <View style={S.rowLeft}>
        <Ionicons name={icon} size={20} color={C.primary} />
        <Text style={S.listText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.sub} />
    </TouchableOpacity>
  );
}

/* ---------- Styles ---------- */
const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 28 },

  /* Identity */
  cardCenter: {
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.cardBg,
  },
  avatarRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: C.blue100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.blue50,
  },
  name: { fontSize: 20, fontWeight: "800", color: C.text, marginTop: 10 },
  email: { fontSize: 14, color: C.sub, marginTop: 2 },

  /* Impact */
  cardBlock: {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  blockHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  blockIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: C.blue50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.blue100,
  },
  blockTitle: { fontSize: 16, fontWeight: "800", color: C.text },

  /* KPIs */
  kpiRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  kpi: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.line,
  },
  kpiIcon: {
    position: "absolute",
    left: 10,
    top: 10,
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: C.blue50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.blue100,
  },
  kpiValue: { fontSize: 22, fontWeight: "800", color: C.text },
  kpiLabel: { fontSize: 12, fontWeight: "800", color: C.sub, marginTop: 2 },

  /* Progress */
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
  },
  progressFill: {
    height: 10,
    backgroundColor: C.primary,
    borderRadius: 999,
  },
  progressText: { marginTop: 6, color: C.sub, fontWeight: "700" },

  /* Section header */
  sectionHeading: { fontSize: 18, fontWeight: "800", color: C.text, marginVertical: 12 },

  /* Rows */
  listItem: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "#fff",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.06 : 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  listText: { fontSize: 16, color: C.text, fontWeight: "600" },
});
