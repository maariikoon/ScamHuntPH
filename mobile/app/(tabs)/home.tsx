// mobile/app/(tabs)/home.tsx
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { auth } from "../../src/firebase";


const API_BASE_URL = "https://analytics-bcvrqgcc6a-as.a.run.app";

export default function Home() {
  const [stats, setStats] = useState<any>({ verified: 0, pending: 0, popular: "—", today: 0 });

  useEffect(() => {
  async function fetchStats() {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();

      // ✅ new summary endpoint
      const res = await fetch(`${API_BASE_URL}/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log("📊 summary response:", data); // 👈 add this

      if (data.ok && data.data) {
        setStats({
          verified: data.data.verified || 0,
          pending: data.data.pending || 0,
          popular: data.data.popularCategory || "—",
          today: data.data.userReportsToday || 0,
        });
      }
    } catch (e) {
      console.error("❌ Stats fetch error:", e);
    }
  }

  fetchStats();
}, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Top brand */}
        <Text style={styles.title}>ScamHuntPH</Text>
        <Text style={styles.subtitle}>
          Awareness is Protection.{"\n"}Reporting is Power.{"\n"}Always Stay Protected.
        </Text>

        {/* This week */}
        <Text style={styles.sectionHeading}>This Week</Text>
        <View style={styles.cardRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Top Scam Category</Text>
            <Text style={styles.cardValue}>{stats.popular}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Verified Reports</Text>
            <Text style={styles.cardValue}>{stats.verified}</Text>
          </View>
        </View>
        <View style={styles.cardRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Your Reports Today</Text>
            <Text style={styles.cardValue}>{stats.today}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Reports To Be Reviewed</Text>
            <Text style={styles.cardValue}>{stats.pending}</Text>
          </View>
        </View>

        {/* General */}
        <Text style={styles.sectionHeading}>General</Text>
        <View style={styles.widgetRow}>
          <Link href="/report" asChild>
            <TouchableOpacity style={styles.widget}>
              <Text style={styles.emoji}>📝</Text>
              <Text style={styles.widgetText}>Report a Scam</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/learn" asChild>
            <TouchableOpacity style={styles.widget}>
              <Text style={styles.emoji}>📘</Text>
              <Text style={styles.widgetText}>Learn Scam</Text>
            </TouchableOpacity>
          </Link>
        </View>
        <View style={styles.widgetRow}>
          <Link href="/reports/myreports" asChild>
            <TouchableOpacity style={styles.widget}>
              <Text style={styles.emoji}>📄</Text>
              <Text style={styles.widgetText}>My Reports</Text>
            </TouchableOpacity>
          </Link>

          <TouchableOpacity style={styles.widget}>
            <Text style={styles.emoji}>🔍</Text>
            <Text style={styles.widgetText}>Browse Public Reports</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  scroll: { padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: "center", color: "#555", marginBottom: 20 },
  sectionHeading: { fontSize: 20, fontWeight: "600", marginTop: 20, marginBottom: 12 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  card: {
    flex: 1,
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },
  cardLabel: { fontSize: 14, color: "#555" },
  cardValue: { fontSize: 20, fontWeight: "700", marginTop: 6 },
  widgetRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  widget: {
    flex: 1,
    padding: 20,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  emoji: { fontSize: 28, marginBottom: 6 },
  widgetText: { fontSize: 16, fontWeight: "600", textAlign: "center" },
});
