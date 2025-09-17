import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../src/firebase";

interface Report {
  id: string;
  message: string;
  status: string;
  createdAt: Date;
}

export default function Alerts() {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const q = query(
        collection(db, "reports"),
        where("sender", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(q);
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Report[];

      setReports(data);
    });

    return () => unsub();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📄 Your Reports</Text>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.reportCard}>
            <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
            <Text>Status: {item.status}</Text>
            <Text>Date: {item.createdAt.toLocaleString()}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  reportCard: { padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 10 },
  message: { fontSize: 14, fontWeight: "500", marginBottom: 4 },
});
