import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet } from "react-native";

export default function PublicReports() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>📂 Public Reports</Text>
        <Text style={styles.subtitle}>
          This page is under construction.{"\n"}
          Soon, you’ll be able to browse scam reports from other users here.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
  subtitle: { fontSize: 16, textAlign: "center", color: "#555" },
});