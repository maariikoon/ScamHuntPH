// mobile/app/(tabs)/alerts.tsx
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Link } from "expo-router";

export default function Alerts() {
  return (
    <View style={styles.container}>

      {/* Navigate to Your Reports */}
      <Link href="/reports" asChild>
        <TouchableOpacity style={styles.card}>
          <Text style={styles.emoji}>📄</Text>
          <Text style={styles.cardText}>Your Reports</Text>
        </TouchableOpacity>
      </Link>

      {/* Navigate to Scam Trends */}
      <Link href="/scam-trends" asChild>
        <TouchableOpacity style={styles.card}>
          <Text style={styles.emoji}>🚨</Text>
          <Text style={styles.cardText}>Scam Trends</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 16,
  },
  emoji: { fontSize: 28, marginRight: 12 },
  cardText: { fontSize: 18, fontWeight: "600" },
});
