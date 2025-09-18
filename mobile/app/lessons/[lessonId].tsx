import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";  // ✅ correct import

const API_BASE_URL = "https://scamhunt-bcvrqgcc6a-as.a.run.app";

type LessonDetail = {
  id: string;
  title: string;
  category?: string;
  content: string | string[] | any;
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export default function LessonDetail() {
  const { learnId } = useLocalSearchParams();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLesson() {
      if (!learnId) {
        console.warn("⚠️ No learnId provided, skipping fetch");
        setError("Invalid lesson ID");
        setLoading(false);
        return;
      }

      try {
        const url = `${API_BASE_URL}/lessons/${learnId}`;
        console.log("🔍 Fetching lesson:", url);

        const res = await fetch(url);
        console.log("🔍 Response status:", res.status);

        const data = await res.json();
        console.log("📖 API response (lesson):", data);

        if (data.ok && data.lesson?.published) {
          setLesson(data.lesson);
        } else {
          setError(data.error || "Lesson not available.");
        }
      } catch (err: any) {
        console.error("❌ Lesson fetch error:", err);
        setError("Failed to load lesson.");
      } finally {
        setLoading(false);
      }
    }

    fetchLesson();
  }, [learnId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!lesson) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>Lesson not found.</Text>
      </SafeAreaView>
    );
  }

  // normalize lesson.content
  let contentText: string;
  if (Array.isArray(lesson.content)) {
    contentText = lesson.content
      .map((p) => (typeof p === "string" ? p : JSON.stringify(p)))
      .join("\n\n");
  } else if (typeof lesson.content === "object") {
    contentText = JSON.stringify(lesson.content, null, 2);
  } else {
    contentText = lesson.content || "";
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{lesson.title}</Text>
        {lesson.category && <Text style={styles.category}>{lesson.category}</Text>}
        <Text style={styles.content}>{contentText}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 16,
  },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  category: { fontSize: 16, color: "#666", marginBottom: 16 },
  content: { fontSize: 16, lineHeight: 22 },
  error: { color: "red", fontSize: 16, textAlign: "center", marginTop: 40 },
});
