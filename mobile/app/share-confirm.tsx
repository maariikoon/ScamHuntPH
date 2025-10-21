// app/share-confirm.tsx
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { auth } from "../src/firebase";

const API_BASE_URL = "https://reports-bcvrqgcc6a-as.a.run.app";

const C = {
  bg: "#ffffff",
  cardBg: "rgba(248, 250, 252, 0.92)",
  text: "#0f172a",
  sub: "#64748b",
  line: "#e6eaf0",
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  blue50: "#eff6ff",
  blue100: "#dbeafe",
  danger: "#ef4444",
  success: "#10b981",
};

export default function ShareConfirm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const sharedMessage = params.message as string;

  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<string>("Phishing/Smishing");
  const [region, setRegion] = useState<string>("NCR");

  const handleConfirm = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in");
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      
      // Create report with user-selected values
      const res = await fetch(`${API_BASE_URL}/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          message: sharedMessage.trim(), 
          category: category,
          region: region
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to create report");
      }

      // Success!
      Alert.alert(
        "✅ Report Submitted",
        "Thank you for sharing this scam message. Your report helps protect others!",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)/home")
          }
        ]
      );
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Report",
      "Are you sure you want to discard this report?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes, Discard", 
          style: "destructive",
          onPress: () => router.replace("/(tabs)/home")
        }
      ]
    );
  };

  return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      <ScrollView 
        contentContainerStyle={S.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={S.header}>
          <View style={S.headerIcon}>
            <Ionicons name="shield-checkmark" size={24} color={C.primary} />
          </View>
          <Text style={S.title}>Confirm Scam Report</Text>
          <Text style={S.subtitle}>
            Review the message before submitting
          </Text>
        </View>

        {/* Message Preview Card */}
        <View style={S.card}>
          <View style={S.cardHeader}>
            <Ionicons name="mail-outline" size={18} color={C.primary} />
            <Text style={S.cardTitle}>Shared Message</Text>
          </View>
          
          <View style={S.messageBox}>
            <ScrollView style={S.messageScroll} nestedScrollEnabled>
              <Text style={S.messageText}>{sharedMessage}</Text>
            </ScrollView>
          </View>

          <View style={S.infoRow}>
            <Ionicons name="information-circle-outline" size={14} color={C.sub} />
            <Text style={S.infoText}>
              Will be reported as "{category}" from {region}
            </Text>
          </View>
        </View>

        {/* Category Picker */}
        <View style={S.card}>
          <View style={S.cardHeader}>
            <Ionicons name="list-outline" size={18} color={C.primary} />
            <Text style={S.cardTitle}>Category</Text>
          </View>
          <View style={S.selectWrap}>
            <Picker 
              selectedValue={category} 
              onValueChange={setCategory} 
              style={S.picker}
              enabled={!loading}
            >
              <Picker.Item label="Phishing/Smishing" value="Phishing/Smishing" />
              <Picker.Item label="Delivery Fraud" value="Delivery Fraud" />
              <Picker.Item label="Fake Job" value="Fake Job" />
              <Picker.Item label="Loan Scam" value="Loan Scam" />
              <Picker.Item label="Investment Scam" value="Investment Scam" />
              <Picker.Item label="Gcash Scam" value="Gcash Scam" />
              <Picker.Item label="Identity theft" value="Identity theft" />
              <Picker.Item label="Lottery Scams" value="Lottery Scams" />
              <Picker.Item label="Others" value="Others" />
            </Picker>
            <Ionicons name="chevron-down" size={16} color={C.sub} style={S.selectIcon} />
          </View>
        </View>

        {/* Region Picker */}
        <View style={S.card}>
          <View style={S.cardHeader}>
            <Ionicons name="location-outline" size={18} color={C.primary} />
            <Text style={S.cardTitle}>Region</Text>
          </View>
          <View style={S.selectWrap}>
            <Picker 
              selectedValue={region} 
              onValueChange={setRegion} 
              style={S.picker}
              enabled={!loading}
            >
              <Picker.Item label="NCR — National Capital Region" value="NCR" />
              <Picker.Item label="Region I — Ilocos Region" value="Region I" />
              <Picker.Item label="Region II — Cagayan Valley" value="Region II" />
              <Picker.Item label="Region III — Central Luzon" value="Region III" />
              <Picker.Item label="Region IV-A — CALABARZON" value="Region IV-A" />
              <Picker.Item label="Region IV-B — MIMAROPA" value="Region IV-B" />
              <Picker.Item label="Region V — Bicol Region" value="Region V" />
              <Picker.Item label="Region VI — Western Visayas" value="Region VI" />
              <Picker.Item label="Region VII — Central Visayas" value="Region VII" />
              <Picker.Item label="Region VIII — Eastern Visayas" value="Region VIII" />
              <Picker.Item label="Region IX — Zamboanga Peninsula" value="Region IX" />
              <Picker.Item label="Region X — Northern Mindanao" value="Region X" />
              <Picker.Item label="Region XI — Davao Region" value="Region XI" />
              <Picker.Item label="Region XII — SOCCSKSARGEN" value="Region XII" />
              <Picker.Item label="Region XIII — Caraga" value="Region XIII" />
              <Picker.Item label="CAR — Cordillera Administrative Region" value="CAR" />
              <Picker.Item label="BARMM — Bangsamoro Autonomous Region" value="BARMM" />
            </Picker>
            <Ionicons name="chevron-down" size={16} color={C.sub} style={S.selectIcon} />
          </View>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity 
          style={S.cancelButton}
          onPress={handleCancel}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Ionicons name="close-circle-outline" size={20} color={C.danger} />
          <Text style={S.cancelButtonText}>Cancel Report</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Fixed Confirm Button */}
      <View style={S.bottomContainer}>
        <TouchableOpacity
          style={[S.confirmButton, loading && { opacity: 0.6 }]}
          onPress={handleConfirm}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={S.confirmButtonText}>Confirm & Submit</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { 
    flexGrow: 1,
    padding: 16, 
    paddingBottom: 20,
  },

  header: { alignItems: "center", marginBottom: 20 },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.blue50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: C.blue100,
  },
  title: { 
    fontSize: 20, 
    fontWeight: "800", 
    color: C.text,
    marginBottom: 4 
  },
  subtitle: { 
    fontSize: 13, 
    color: C.sub, 
    textAlign: "center",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  cardTitle: { 
    fontSize: 15, 
    fontWeight: "700", 
    color: C.text 
  },

  messageBox: {
    backgroundColor: C.cardBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: C.line,
    marginBottom: 10,
    maxHeight: 200,
  },
  messageScroll: {
    maxHeight: 180,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: C.text,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: C.blue50,
    padding: 8,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: C.sub,
    lineHeight: 16,
  },

  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.danger,
  },

  bottomContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  confirmButton: {
    backgroundColor: C.success,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  selectWrap: {
    position: "relative",
    backgroundColor: C.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    marginTop: 4,
    overflow: "hidden",
  },
  selectIcon: {
    position: "absolute",
    right: 10,
    top: Platform.OS === "ios" ? 12 : 16,
    pointerEvents: "none",
  },
    picker: {
    width: "100%",
    color: C.text,
    fontSize: 12,
    ...(Platform.OS === "ios"
        ? { height: 40, paddingHorizontal: 8 }
        : { height: 60, paddingHorizontal: 8 }),
    },
});