import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

const API_BASE_URL = "https://lessons-bcvrqgcc6a-as.a.run.app";

type Lesson = {
  id: string;
  title: string;
  category: string;
  published: boolean;
};

export default function Learn() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchLessons() {
      try {
        const res = await fetch(`${API_BASE_URL}/`);
        const data = await res.json();
        console.log("📘 API response (lessons):", data);

        if (data.ok) {
          setLessons(data.lessons.filter((l: Lesson) => l.published));
        } else {
          setError(data.error || "Failed to fetch lessons.");
        }
      } catch (err) {
        console.error("❌ Lessons fetch error:", err);
        setError("Failed to load lessons.");
      } finally {
        setLoading(false);
      }
    }
    fetchLessons();
  }, []);

  const renderItem = ({ item }: { item: Lesson }) => (
    <TouchableOpacity
      style={styles.lessonItem}
      onPress={() => router.push({ pathname: "/lessons/[lessonId]", params: { learnId: item.id } })}
    >
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.category}>{item.category}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList data={lessons} keyExtractor={(item) => item.id} renderItem={renderItem} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  lessonItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  title: { fontSize: 18, fontWeight: "600" },
  category: { fontSize: 14, color: "#666" },
  error: { color: "red", fontSize: 16, textAlign: "center", marginTop: 40 },
});
