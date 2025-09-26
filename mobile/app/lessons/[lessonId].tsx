import { useEffect, useState, useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RenderHTML from "react-native-render-html";

const API_BASE_URL = "https://lessons-bcvrqgcc6a-as.a.run.app";

/* ---------- Types ---------- */
type LessonDetail = {
  id: string;
  title: string;
  category?: string;
  content: string;
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
};

/* ---------- Theme ---------- */
const C = {
  bg: "#ffffff",
  text: "#0f172a",
  sub: "#64748b",
  line: "#e5e7eb",
  cardBg: "#f8fafc",
  primary: "#2563eb",
  primaryDark: "#1e40af",
};

/* ---------- Utils ---------- */
// strip shell tags/scripts/styles but keep body content
function cleanHTML(raw: any): string {
  if (typeof raw !== "string") {
    try {
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

function fmtDate(iso?: string) {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString();
}

/* ---------- Screen ---------- */
export default function LessonDetailScreen() {
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
        const res = await fetch(`${API_BASE_URL}/${learnId}`);
        const data = await res.json();
        if (data.ok && data.lesson?.published) {
          setLesson(data.lesson);
        } else {
          setError(data.error || "Lesson not available.");
        }
      } catch {
        setError("Failed to load lesson.");
      } finally {
        setLoading(false);
      }
    }
    fetchLesson();
  }, [learnId]);

  const cleaned = useMemo(() => cleanHTML(lesson?.content || ""), [lesson?.content]);
  const updated = lesson?.updatedAt ? fmtDate(lesson.updatedAt) : fmtDate(lesson?.createdAt);

  if (loading) {
    return (
      <SafeAreaView style={S.safeArea}>
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={S.safeArea}>
        <View style={S.centerWrap}>
          <Text style={S.error}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!lesson) {
    return (
      <SafeAreaView style={S.safeArea}>
        <View style={S.centerWrap}>
          <Text style={S.error}>Lesson not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.safeArea}>
      <ScrollView contentContainerStyle={S.scrollContent}>
        {/* Header */}
        <View style={S.header}>
          <Text style={S.title}>{lesson.title}</Text>
          <View style={S.metaRow}>
            {lesson.category ? <Text style={S.pill}>{lesson.category}</Text> : <View />}
            {updated && <Text style={S.timestamp}>Updated • {updated}</Text>}
          </View>
        </View>

        {/* Content Card */}
        {cleaned.trim().length === 0 ? (
          <View style={[S.card, { alignItems: "center" }]}>
            <Text style={S.empty}>No content available.</Text>
          </View>
        ) : (
          <View style={S.card}>
            <RenderHTML
              contentWidth={width - 32} // card padding accounted
              source={{ html: cleaned }}
              baseStyle={{ color: C.text }}
              tagsStyles={{
                h1: { fontSize: 24, fontWeight: "800", marginBottom: 12, color: C.text },
                h2: { fontSize: 20, fontWeight: "800", marginTop: 18, marginBottom: 8, color: C.text },
                h3: { fontSize: 18, fontWeight: "800", marginTop: 16, marginBottom: 6, color: C.text },
                p: { fontSize: 16, lineHeight: 24, marginBottom: 12, color: C.text },
                ul: { marginBottom: 12, paddingLeft: 20 },
                ol: { marginBottom: 12, paddingLeft: 20 },
                li: { fontSize: 16, lineHeight: 24, marginBottom: 6, color: C.text },
                a: { color: C.primary, textDecorationLine: "underline", fontWeight: "700" },
                blockquote: {
                  borderLeftWidth: 4,
                  borderLeftColor: C.primary,
                  backgroundColor: "#eef2ff",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  marginVertical: 10,
                  color: C.text,
                },
                code: {
                  fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
                  fontSize: 14,
                  backgroundColor: "#e2e8f0",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                },
                pre: {
                  fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
                  fontSize: 14,
                  backgroundColor: "#e2e8f0",
                  padding: 10,
                  borderRadius: 10,
                  overflow: "hidden",
                },
                img: {
                  maxWidth: "100%",
                  borderRadius: 10,
                },
                hr: {
                  borderBottomColor: C.line,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  marginVertical: 14,
                },
                strong: { fontWeight: "800" },
                b: { fontWeight: "800" },
                em: { fontStyle: "italic" },
              }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scrollContent: { padding: 16, paddingBottom: 24 },

  header: { marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "800", color: C.text, marginBottom: 6 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
    color: C.text,
    overflow: "hidden",
    fontWeight: "700",
  },
  timestamp: { color: C.sub, fontSize: 12 },

  card: {
    backgroundColor: C.cardBg,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: "#ef4444", fontSize: 16, textAlign: "center" },
  empty: { color: C.sub, fontSize: 16 },
});
