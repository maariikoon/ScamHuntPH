import { useEffect, useState, useCallback } from "react";
import {
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../src/firebase";

const API_BASE_URL = "https://reports-bcvrqgcc6a-as.a.run.app";

export default function UserReport() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "declined">("all");

  const fetchReports = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        let list = [...data.reports];

        if (filter !== "all") {
          list = list.filter((r) => r.status === filter);
        }

        list.sort((a, b) => {
          return sortOrder === "newest"
            ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        setReports(list);
      } else {
        console.warn("⚠️ Failed to fetch reports:", data.error);
      }
    } catch (err) {
      console.error("❌ Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  }, [sortOrder, filter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.reportItem}>
      <Text style={styles.message}>{item.message}</Text>
      <Text style={styles.meta}>
        {item.category} · {item.region}
      </Text>
      <Text
        style={[
          styles.status,
          item.status === "pending"
            ? styles.statusPending
            : item.status === "verified"
            ? styles.statusVerified
            : styles.statusDeclined,
        ]}
      >
        Status: {item.status}
      </Text>
      {item.createdAt && (
        <Text style={styles.date}>
          Submitted: {new Date(item.createdAt).toLocaleString()}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <Text style={styles.heading}>Your Reports</Text>

        {/* 🔹 Sort Controls (right aligned) */}
        <View style={styles.sortRow}>
          {["newest", "oldest"].map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.sortButton,
                sortOrder === s && styles.sortButtonActive,
              ]}
              onPress={() => setSortOrder(s as "newest" | "oldest")}
            >
              <Text
                style={[
                  styles.sortText,
                  sortOrder === s && styles.sortTextActive,
                ]}
              >
                {s === "newest" ? "⬆️ Newest" : "⬇️ Oldest"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 🔹 Status Filters (one row, evenly spaced) */}
        <View style={styles.filterRow}>
          {["all", "pending", "verified", "declined"].map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterButton,
                filter === f && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(f as any)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {reports.length === 0 && !loading ? (
          <Text style={styles.empty}>📭 No reports yet.</Text>
        ) : (
          <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={fetchReports} />
            }
          />
        )}
      </View>
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
  },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },

  // 🔹 Sort (Newest/Oldest, right aligned)
  sortRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#f9f9f9",
    marginLeft: 6,
  },
  sortButtonActive: {
    backgroundColor: "#e6f0ff",
    borderColor: "#007AFF",
    borderWidth: 1,
  },
  sortText: {
    fontSize: 14,
    color: "#555",
  },
  sortTextActive: {
    fontWeight: "bold",
    color: "#007AFF",
  },

  // 🔹 Status filters (always one row)
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 6,
    marginBottom: 12,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: "#f9f9f9",
  },
  filterButtonActive: {
    backgroundColor: "#e6f0ff",
    borderColor: "#007AFF",
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    color: "#555",
  },
  filterTextActive: {
    fontWeight: "bold",
    color: "#007AFF",
  },

  // 🔹 Report items
  reportItem: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    backgroundColor: "#fdfdfd",
  },
  message: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  status: {
    fontStyle: "italic",
    marginBottom: 4,
  },
  statusPending: { color: "#d17b00" },
  statusVerified: { color: "green" },
  statusDeclined: { color: "red" },
  date: {
    fontSize: 12,
    color: "#999",
  },
  empty: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
    color: "#777",
  },
});
