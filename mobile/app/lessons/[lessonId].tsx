import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RenderHTML from "react-native-render-html";

const API_BASE_URL = "https://lessons-bcvrqgcc6a-as.a.run.app";

type LessonDetail = {
  id: string;
  title: string;
  category?: string;
  content: string;
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
};

// 🔹 Clean HTML: strip <head>, <meta>, <script>, but keep body content
function cleanHTML(raw: any): string {
  if (typeof raw !== "string") {
    try {
      // fallback: convert arrays or objects to text
      return JSON.stringify(raw, null, 2);
    } catch {
      return "";
    }
  }

  return raw
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<\/?(html|head|body)[^>]*>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<title[^>]*>.*?<\/title>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
}

export default function LessonDetail() {
  const { learnId } = useLocalSearchParams();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    async function fetchLesson() {
      if (!learnId) {
        setError("Invalid lesson ID");
        setLoading(false);
        return;
      }

      try {
        const url = `${API_BASE_URL}/${learnId}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.ok && data.lesson?.published) {
          setLesson(data.lesson);
        } else {
          setError(data.error || "Lesson not available.");
        }
      } catch (err: any) {
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

  const cleaned = cleanHTML(lesson.content || "");

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{lesson.title}</Text>
        {lesson.category && <Text style={styles.category}>{lesson.category}</Text>}

        {/* ✅ Render styled HTML */}
        <RenderHTML
          contentWidth={width}
          source={{ html: cleaned }}
          tagsStyles={{
            h1: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
            h2: { fontSize: 20, fontWeight: "bold", marginTop: 16, marginBottom: 8 },
            p: { fontSize: 16, lineHeight: 24, marginBottom: 12 },
            ul: { marginBottom: 12, paddingLeft: 20 },
            li: { marginBottom: 6, fontSize: 16, lineHeight: 22 },
            strong: { fontWeight: "bold" },
            b: { fontWeight: "bold" },
            em: { fontStyle: "italic" },
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  scrollContent: { padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  category: { fontSize: 16, color: "#666", marginBottom: 16 },
  error: { color: "red", fontSize: 16, textAlign: "center", marginTop: 40 },
});
