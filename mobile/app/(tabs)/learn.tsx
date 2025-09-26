import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import React from "react";

const API_BASE_URL = "https://lessons-bcvrqgcc6a-as.a.run.app";

type Lesson = {
  id: string;
  title: string;
  category: string;
  published: boolean;
};

export default function Learn() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI
  const [query, setQuery] = useState("");

  const fetchLessons = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true); // only show spinner on first load
      const res = await fetch(`${API_BASE_URL}/`);
      const data = await res.json();
      console.log("📘 API response (lessons):", data);

      if (data.ok && Array.isArray(data.lessons)) {
        setLessons((data.lessons as Lesson[]).filter((l) => l.published));
        setError(null);
      } else {
        setError(data.error || "Failed to fetch lessons.");
      }
    } catch (err) {
      console.error("❌ Lessons fetch error:", err);
      setError("Failed to load lessons.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lessons;
    return lessons.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        (l.category || "").toLowerCase().includes(q)
    );
  }, [lessons, query]);

  const renderItem = ({ item }: { item: Lesson }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() =>
        router.push({
          pathname: "/lessons/[lessonId]",
          params: { learnId: item.id }, // ✅ unchanged
        })
      }
    >
      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.pill}>{item.category || "General"}</Text>
        <Text style={styles.chev}>›</Text>
      </View>
      <View style={styles.cardAccent} />
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View style={styles.headerWrap}>
      <Text style={styles.heading}>Learn</Text>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search lessons…"
          style={styles.search}
          placeholderTextColor="#64748b"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => setQuery("")}
            style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
          >
            <Text style={styles.clearTxt}>×</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && !refreshing ? (
        <>
          <ListHeader />
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 20 }} />
        </>
      ) : error ? (
        <View style={styles.centerWrap}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchLessons}>
            <Text style={styles.retryTxt}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchLessons();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerWrap}>
              <Text style={styles.empty}>No lessons found.</Text>
              {!!query && <Text style={styles.emptySub}>Try a different search.</Text>}
            </View>
          }
        />
      )}
    </View>
  );
}

/* ---------- Theme ---------- */
const C = {
  bg: "#ffffff",
  text: "#0f172a",
  sub: "#64748b",
  line: "#e5e7eb",
  cardBg: "#f8fafc",
  primary: "#2563eb",
};

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  headerWrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  heading: { fontSize: 24, fontWeight: "800", color: C.text, marginBottom: 8 },

  searchRow: { position: "relative" },
  search: {
    backgroundColor: C.cardBg,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: C.text,
  },
  clearBtn: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e2e8f0",
  },
  clearTxt: { color: C.text, fontSize: 18, fontWeight: "700", lineHeight: 18 },

  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: C.cardBg,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    // subtle shadow
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    overflow: "hidden",
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: C.text },
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pill: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
    color: C.text,
    overflow: "hidden",
  },
  chev: { fontSize: 24, color: "#94a3b8", marginLeft: 8 },

  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: C.primary,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },

  centerWrap: { alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: "#ef4444", fontSize: 16, textAlign: "center", marginBottom: 12 },
  retryBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryTxt: { color: "#fff", fontWeight: "800" },

  empty: { color: C.text, fontSize: 16, marginTop: 20 },
  emptySub: { color: C.sub, fontSize: 14, marginTop: 6 },
});
