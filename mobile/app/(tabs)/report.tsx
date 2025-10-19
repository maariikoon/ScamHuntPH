// app/(tabs)/report.tsx
import React, { JSX, useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  View,
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import { auth } from "../../src/firebase";

const API_BASE_URL = "https://reports-bcvrqgcc6a-as.a.run.app";

/* -------------------- Theme -------------------- */
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
};

/* -------------------- Component -------------------- */
export default function Report(): JSX.Element {
  const [message, setMessage] = useState<string>("");
  const [category, setCategory] = useState<string>("Phishing/Smishing");
  const [region, setRegion] = useState<string>("NCR");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Clipboard
  const [clipText, setClipText] = useState<string>("");

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const has = await Clipboard.hasStringAsync();
          if (!mounted) return;
          if (has) {
            const txt = await Clipboard.getStringAsync();
            if (mounted) setClipText(txt.trim());
          } else {
            setClipText("");
          }
        } catch {
          // ignore
        }
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  // Pick an image
  const pickImage = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // Only read global.sharedText once
  useEffect(() => {
    if ((global as any).sharedText) {
      const txt = ((global as any).sharedText as string).trim();
      setMessage(txt);
      (global as any).sharedText = null;
      setTimeout(() => {
        Alert.alert("📩 Message received", "Scam message loaded from share.");
      }, 400);
    }
  }, []);

  // API helpers
  async function createReport(token: string, msg: string, cat: string, reg: string): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: msg, category: cat, region: reg }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Failed to create report");
    return data.id as string;
  }

  async function getSignedUrl(token: string, reportId: string, filename: string) {
    const res = await fetch(`${API_BASE_URL}/uploadUrl`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reportId, filename }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Failed to get signed URL");
    return data as { uploadUrl: string; readUrl: string };
  }

  async function uploadWithSignedUrl(uri: string, uploadUrl: string) {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    const contentType = (blob as any).type || "application/octet-stream";
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: blob as any,
    });
    if (!put.ok) {
      const errText = await put.text();
      throw new Error(`Failed to upload file to GCS: ${put.status} ${errText}`);
    }
  }

  async function addEvidence(token: string, reportId: string, url: string) {
    const res = await fetch(`${API_BASE_URL}/${reportId}/evidence`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Failed to attach evidence");
  }

  const canSubmit = useMemo(() => message.trim().length > 0 && !loading, [message, loading]);

  // Submit flow
  const handleSubmit = async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) return Alert.alert("Error", "You must be logged in");

    if (message.trim().length === 0) {
      return Alert.alert("Missing message", "Please paste or type the scam text.");
    }

    Alert.alert(
      "Confirm Report",
      `You are about to submit this message:\n\n"${message.trim()}"\n\nDo you want to continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            setLoading(true);
            try {
              const token = await user.getIdToken();
              const reportId = await createReport(token, message.trim(), category, region);
              if (image) {
                const filename = "screenshot.jpg";
                const { uploadUrl, readUrl } = await getSignedUrl(token, reportId, filename);
                await uploadWithSignedUrl(image, uploadUrl);
                await addEvidence(token, reportId, readUrl);
              }
              Alert.alert(
                "✅ Report Submitted",
                "Thank you for submitting a report. Your contribution helps raise awareness and protect others. Our team will review and verify the details you provided."
              );
              setMessage("");
              setImage(null);
            } catch (e: any) {
              Alert.alert("Error", e.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const pasteFromClipboard = async () => {
    try {
      const txt = await Clipboard.getStringAsync();
      if (txt?.trim()) setMessage(txt.trim());
    } catch {}
  };

  const clearMessage = () => setMessage("");

  /* -------------------- UI -------------------- */
  return (
    <SafeAreaView style={S.container}>
      <ScrollView contentContainerStyle={S.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={S.headerRow}>
          <View style={S.headerIcon}>
            <Ionicons name="shield-checkmark-outline" size={20} color={C.primary} />
          </View>
          <Text style={S.h1}>Report a Scam</Text>
        </View>
        <Text style={S.desc}>
          Help us build awareness by sharing scam messages you encounter. If you’ve received an SMS that seems suspicious,
          report it here. Your submission will support scam education, awareness, and research.
        </Text>

        {/* Clipboard chip */}
        {clipText && message.trim().length === 0 && (
          <Pressable onPress={pasteFromClipboard} style={({ pressed }) => [S.chip, pressed && { opacity: 0.7 }]}>
            <Ionicons name="clipboard-outline" size={16} color={C.primaryDark} />
            <Text numberOfLines={1} style={S.chipText}>Paste from clipboard</Text>
          </Pressable>
        )}

        {/* Message */}
        <View style={S.card}>
          <View style={S.cardHead}>
            <View style={S.cardHeadIcon}><Ionicons name="chatbox-ellipses-outline" size={16} color={C.primary} /></View>
            <Text style={S.cardTitle}>Scam Message</Text>
          </View>

          <View style={S.inputWrap}>
            <TextInput
              style={S.input}
              placeholder="Paste scam message here..."
              multiline
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
              autoCorrect={false}
              placeholderTextColor={C.sub}
            />
            <View style={S.inputActions}>
              <Pressable onPress={pasteFromClipboard} style={({ pressed }) => [S.inputBtn, pressed && { opacity: 0.7 }]}>
                <Ionicons name="clipboard-outline" size={16} color={C.primary} />
                <Text style={S.inputBtnText}>Paste</Text>
              </Pressable>
              {message.length > 0 && (
                <Pressable onPress={clearMessage} style={({ pressed }) => [S.inputBtn, pressed && { opacity: 0.7 }]}>
                  <Ionicons name="close-circle-outline" size={16} color={C.sub} />
                  <Text style={S.inputBtnText}>Clear</Text>
                </Pressable>
              )}
            </View>
            <Text style={S.counter}>{message.length}</Text>
          </View>
        </View>

        {/* Category */}
        <View style={S.card}>
          <View style={S.cardHead}>
            <View style={S.cardHeadIcon}><Ionicons name="list-outline" size={16} color={C.primary} /></View>
            <Text style={S.cardTitle}>Category</Text>
          </View>
          <View style={S.selectWrap}>
            <Picker selectedValue={category} onValueChange={setCategory} style={S.picker}>
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
            <Ionicons name="chevron-down" size={18} color={C.sub} style={S.selectIcon} />
          </View>
        </View>

        {/* Region */}
        <View style={S.card}>
          <View style={S.cardHead}>
            <View style={S.cardHeadIcon}><Ionicons name="location-outline" size={16} color={C.primary} /></View>
            <Text style={S.cardTitle}>Region</Text>
          </View>
          <View style={S.selectWrap}>
            <Picker selectedValue={region} onValueChange={setRegion} style={S.picker}>
              <Picker.Item label="NCR – National Capital Region" value="NCR" />
              <Picker.Item label="Region I – Ilocos Region" value="Region I" />
              <Picker.Item label="Region II – Cagayan Valley" value="Region II" />
              <Picker.Item label="Region III – Central Luzon" value="Region III" />
              <Picker.Item label="Region IV-A – CALABARZON" value="Region IV-A" />
              <Picker.Item label="Region IV-B – MIMAROPA" value="Region IV-B" />
              <Picker.Item label="Region V – Bicol Region" value="Region V" />
              <Picker.Item label="Region VI – Western Visayas" value="Region VI" />
              <Picker.Item label="Region VII – Central Visayas" value="Region VII" />
              <Picker.Item label="Region VIII – Eastern Visayas" value="Region VIII" />
              <Picker.Item label="Region IX – Zamboanga Peninsula" value="Region IX" />
              <Picker.Item label="Region X – Northern Mindanao" value="Region X" />
              <Picker.Item label="Region XI – Davao Region" value="Region XI" />
              <Picker.Item label="Region XII – SOCCSKSARGEN" value="Region XII" />
              <Picker.Item label="Region XIII – Caraga" value="Region XIII" />
              <Picker.Item label="CAR – Cordillera Administrative Region" value="CAR" />
              <Picker.Item label="BARMM – Bangsamoro Autonomous Region in Muslim Mindanao" value="BARMM" />
            </Picker>
            <Ionicons name="chevron-down" size={18} color={C.sub} style={S.selectIcon} />
          </View>
        </View>

        {/* Evidence */}
        <View style={S.card}>
          <View style={S.cardHead}>
            <View style={S.cardHeadIcon}><Ionicons name="images-outline" size={16} color={C.primary} /></View>
            <Text style={S.cardTitle}>Evidence (optional)</Text>
          </View>

          {image ? (
            <View style={S.imagePreviewContainer}>
              <Image source={{ uri: image }} style={S.imagePreview} />
              <TouchableOpacity style={S.removeImageButton} onPress={() => setImage(null)}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={S.imageButton} onPress={pickImage}>
              <Ionicons name="image-outline" size={18} color={C.primary} />
              <Text style={S.imageButtonText}>Attach Screenshot</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Fixed submit button */}
      <TouchableOpacity
        style={[S.fixedButton, !canSubmit && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={!canSubmit}
        activeOpacity={0.9}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={S.buttonText}>Submit Report</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* -------------------- Styles -------------------- */
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 120 },

  /* Header */
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  headerIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.blue50, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.blue100,
  },
  h1: { fontSize: 24, fontWeight: "800", color: C.text },
  desc: { fontSize: 14, color: C.sub, marginBottom: 12 },

  /* Chip */
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.blue100,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.blue100,
  },
  chipText: { color: C.primaryDark, fontWeight: "800" },

  /* Card wrapper */
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  cardHeadIcon: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: C.blue50, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.blue100,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: C.text },

  /* Input area */
  inputWrap: {
    backgroundColor: C.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  input: { minHeight: 120, fontSize: 16, color: C.text },
  inputActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  inputBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.blue50,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.blue100,
  },
  inputBtnText: { color: C.primaryDark, fontWeight: "800" },
  counter: { position: "absolute", right: 10, bottom: 8, fontSize: 12, color: C.sub },

  /* Selects */
  selectWrap: {
    position: "relative",
    backgroundColor: C.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    marginTop: 4,
    overflow: "hidden",
  },
  selectIcon: {
    position: "absolute",
    right: 10,
    top: Platform.OS === "ios" ? 14 : 18,
    pointerEvents: "none",
  },
  picker: {
    width: "100%",
    color: C.text,
    ...(Platform.OS === "ios"
      ? { height: 44, paddingHorizontal: 10 }
      : { height: 50, paddingHorizontal: 6 }),
  },

  /* Evidence */
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
    backgroundColor: C.blue50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.blue100,
  },
  imageButtonText: { color: C.primary, fontSize: 15, fontWeight: "800" },

  imagePreviewContainer: {
    width: 240,
    height: 240,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    overflow: "hidden",
    marginTop: 6,
  },
  imagePreview: { width: "100%", height: "100%" },
  removeImageButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Submit */
  fixedButton: {
    position: "absolute",
    bottom: 10,
    left: 12,
    right: 12,
    backgroundColor: C.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
