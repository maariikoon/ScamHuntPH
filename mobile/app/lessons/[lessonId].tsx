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
import RenderHTML, { MixedStyleRecord, RenderersProps } from "react-native-render-html";

/* ---------- API ---------- */
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
  line: "#e6eaf0",
  cardBg: "rgba(248, 250, 252, 0.92)",
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  blue50: "#eff6ff",
  blue100: "#dbeafe",
};

/* ---------- Utils ---------- */
// Strip outer shells and scripts/styles; keep inner body content
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

  // Inner content width (keeps images/code neatly within card on mid-size phones)
  const contentW = Math.min(width - 32, 360);

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
        if (data?.ok && data?.lesson?.published) {
          setLesson(data.lesson);
          setError(null);
        } else {
          setError(data?.error || "Lesson not available.");
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

  // Typed tag styles for RenderHTML
  const tagStyles: MixedStyleRecord = useMemo(
    () => ({
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
        backgroundColor: C.blue50,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
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
        width: contentW,
        maxWidth: contentW,
        borderRadius: 12,
      },
      hr: {
        borderBottomColor: C.line,
        borderBottomWidth: StyleSheet.hairlineWidth,
        marginVertical: 14,
      },
      strong: { fontWeight: "800" },
      b: { fontWeight: "800" },
      em: { fontStyle: "italic" },
    }),
    [contentW]
  );

  const rProps: RenderersProps = {
    img: { enableExperimentalPercentWidth: true },
    a: {},
    ol: {},
    ul: {},
  };

  if (loading) {
    return (
      <SafeAreaView style={S.safeArea}>
        <View style={S.centerWrap}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={[S.subtle, { marginTop: 10 }]}>Loading lesson…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={S.safeArea}>
        <View style={S.centerWrap}>
          <View style={S.emptyIcon} />
          <Text style={S.error}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!lesson) {
    return (
      <SafeAreaView style={S.safeArea}>
        <View style={S.centerWrap}>
          <View style={S.emptyIcon} />
          <Text style={S.error}>Lesson not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.safeArea}>
      <ScrollView contentContainerStyle={S.scrollContent}>
        {/* Header */}
        <View style={S.headerCard}>
          <View style={S.headerIcon}>
            {/* simple book glyph using a block */}
            <View style={S.headerGlyph} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.title}>{lesson.title}</Text>
            <View style={S.metaRow}>
              {lesson.category ? <Text style={S.pill}>{lesson.category}</Text> : <View />}
              {updated && <Text style={S.timestamp}>Updated • {updated}</Text>}
            </View>
          </View>
        </View>

        {/* Content Card */}
        {cleaned.trim().length === 0 ? (
          <View style={[S.card, { alignItems: "center" }]}>
            <Text style={S.empty}>No content available.</Text>
          </View>
        ) : (
          <View style={S.card}>
            {/* left blue accent */}
            <View style={S.cardAccent} />
            <RenderHTML
              contentWidth={contentW}
              source={{ html: cleaned }}
              baseStyle={{ color: C.text }}
              tagsStyles={tagStyles}
              renderersProps={rProps}
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

  /* Header card */
  headerCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "#fff",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: C.blue50,
    borderWidth: 1, borderColor: C.blue100,
    alignItems: "center", justifyContent: "center",
    marginTop: 2,
  },
  headerGlyph: {
    width: 18, height: 18, borderRadius: 4, backgroundColor: C.primary,
  },
  title: { fontSize: 22, fontWeight: "800", color: C.text },
  metaRow: { marginTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.blue50,
    borderWidth: 1,
    borderColor: C.blue100,
    color: C.text,
    overflow: "hidden",
    fontWeight: "700",
  },
  timestamp: { color: C.sub, fontSize: 12 },

  /* Content card */
  card: {
    position: "relative",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardAccent: {
    position: "absolute",
    left: 0, top: 0, bottom: 0,
    width: 5,
    backgroundColor: C.primary,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },

  /* States */
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  subtle: { color: C.sub, fontSize: 13 },
  emptyIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.blue50,
    borderWidth: 1, borderColor: C.blue100,
    marginBottom: 6,
  },
  error: { color: "#ef4444", fontSize: 16, textAlign: "center" },
  empty: { color: C.sub, fontSize: 16 },
});
