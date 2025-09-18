import { SafeAreaView } from "react-native-safe-area-context";
import { Text, StyleSheet } from "react-native";

export default function ScamTrends() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🚨 Scam Trends</Text>
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  text: { fontSize: 16, color: "#666" },
});
