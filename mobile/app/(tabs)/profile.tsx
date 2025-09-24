import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../src/firebase";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { Link } from "expo-router";

const db = getFirestore();
const API_BASE_URL = "https://analytics-bcvrqgcc6a-as.a.run.app";

export default function Profile() {
  const [userData, setUserData] = useState<any>(null);
  const [impact, setImpact] = useState<{ total: number; verified: number }>({
    total: 0,
    verified: 0,
  });

  useEffect(() => {
    async function fetchUserAndImpact() {
      const user = auth.currentUser;
      if (!user) return;

      // 1. Fetch user profile doc
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setUserData(snap.data());
      } else {
        setUserData({ email: user.email });
      }

      // 2. Fetch user impact stats from analytics backend
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log("📊 Impact summary:", data);

      if (data.ok && data.data) {
        setImpact({
          total: data.data.userReportsTotal || 0,
          verified: data.data.userReportsVerified || 0,
        });
      }
    }

    fetchUserAndImpact();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* User Card */}
        <View style={styles.card}>
          <Ionicons name="person-circle-outline" size={60} color="#007AFF" />
          <Text style={styles.name}>
            {userData?.firstName || "User"} {userData?.lastName || ""}
          </Text>
          <Text style={styles.email}>
            {userData?.email || auth.currentUser?.email}
          </Text>
        </View>

        {/* Impact Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Impact</Text>
          <Text>Reported scams: {impact.total}</Text>
          <Text>Verified scams: {impact.verified}</Text>
        </View>

        {/* Settings Section */}
        <Text style={styles.sectionHeading}>Settings</Text>
        <Link href="/profile/account-settings" asChild>
          <TouchableOpacity style={styles.listItem}>
            <Text style={styles.listText}>Account Settings</Text>
          </TouchableOpacity>
        </Link>
        <TouchableOpacity style={styles.listItem}>
          <Text style={styles.listText}>Privacy and Security</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.listItem}>
          <Text style={styles.listText}>Notification Preferences</Text>
        </TouchableOpacity>
        <Link href="/reports/myreports" asChild>
          <TouchableOpacity style={styles.listItem}>
            <Text style={styles.listText}>My Reports</Text>
          </TouchableOpacity>
        </Link>

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.listItem, { backgroundColor: "#f8d7da" }]}
          onPress={async () => {
            await auth.signOut();
          }}
        >
          <Text style={[styles.listText, { color: "red" }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  scroll: { padding: 20 },
  card: {
    alignItems: "center",
    padding: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },
  name: { fontSize: 20, fontWeight: "700", marginTop: 8 },
  email: { fontSize: 14, color: "#555", marginTop: 4 },
  cardTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  sectionHeading: { fontSize: 20, fontWeight: "600", marginVertical: 12 },
  listItem: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  listText: { fontSize: 16 },
});
