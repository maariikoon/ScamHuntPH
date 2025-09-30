// app/(tabs)/report.tsx
import { JSX, useCallback, useState, useMemo } from "react";
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
import ShareMenu from "react-native-share-menu";
import { useEffect } from "react";

const API_BASE_URL = "https://reports-bcvrqgcc6a-as.a.run.app";

/* -------------------- Theme -------------------- */
const C = {
  bg: "#ffffff",
  cardBg: "#f8fafc",
  text: "#0f172a",
  sub: "#64748b",
  line: "#e5e7eb",
  primary: "#2563eb",
  primaryDark: "#1e40af",
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

  // 🔹 Pick an image
  const pickImage = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

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
    const contentType = blob.type || "application/octet-stream";

    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: blob,
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

  // 🔹 Submit flow with preview & thank you
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Report a Scam</Text>

        {/* New description */}
        <Text style={styles.description}>
          Help us build awareness by sharing scam messages you encounter. If you’ve received an SMS that seems suspicious, report it here. Your submission will be added to our database to support scam education, awareness, and future research.
        </Text>

        {/* Clipboard prompt chip */}
        {clipText && message.trim().length === 0 && (
          <Pressable onPress={pasteFromClipboard} style={({ pressed }) => [styles.clipChip, pressed && { opacity: 0.7 }]}>
            <Ionicons name="clipboard-outline" size={16} color={C.primaryDark} />
            <Text numberOfLines={1} style={styles.clipChipText}>
              Paste from clipboard
            </Text>
          </Pressable>
        )}

        {/* Message input with actions */}
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Paste scam message here..."
            multiline
            value={message}
            onChangeText={setMessage}
            textAlignVertical="top"
            autoCorrect={false}
          />
          <View style={styles.inputActions}>
            <Pressable onPress={pasteFromClipboard} style={({ pressed }) => [styles.inputBtn, pressed && { opacity: 0.7 }]}>
              <Ionicons name="clipboard-outline" size={16} color={C.primary} />
              <Text style={styles.inputBtnText}>Paste</Text>
            </Pressable>
            {message.length > 0 && (
              <Pressable onPress={clearMessage} style={({ pressed }) => [styles.inputBtn, pressed && { opacity: 0.7 }]}>
                <Ionicons name="close-circle-outline" size={16} color={C.sub} />
                <Text style={styles.inputBtnText}>Clear</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.counter}>{message.length}</Text>
        </View>

        {/* Category */}
        <Text style={styles.label}>Select Category</Text>
        <View style={styles.selectWrap}>
          <Picker selectedValue={category} onValueChange={setCategory} style={styles.picker}>
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
          <Ionicons name="chevron-down" size={18} color={C.sub} style={styles.selectIcon} />
        </View>

        {/* Region */}
        <Text style={styles.label}>Select Region</Text>
        <View style={styles.selectWrap}>
          <Picker selectedValue={region} onValueChange={setRegion} style={styles.picker}>
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
          <Ionicons name="chevron-down" size={18} color={C.sub} style={styles.selectIcon} />
        </View>

        {/* Evidence */}
        {image ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: image }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => setImage(null)}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            <Ionicons name="image-outline" size={18} color={C.primary} />
            <Text style={styles.imageButtonText}>Attach Screenshot</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* fixed submit button */}
      <TouchableOpacity
        style={[styles.fixedButton, !canSubmit && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={!canSubmit}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Report</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* -------------------- Styles -------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContainer: { padding: 20, paddingBottom: 110 },

  title: { fontSize: 28, fontWeight: "800", color: C.text, marginBottom: 8 },

  description: {
    fontSize: 14,
    color: C.sub,
    marginBottom: 16,
    textAlign: "left",
  },

  /* Clipboard chip */
  clipChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#c7d2fe",
  },
  clipChipText: { color: C.primaryDark, fontWeight: "700" },

  /* Input with accessories */
  inputWrap: {
    backgroundColor: C.cardBg,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: 10,
    marginBottom: 16,
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
    backgroundColor: "#eef2ff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inputBtnText: { color: C.primaryDark, fontWeight: "700" },
  counter: { position: "absolute", right: 10, bottom: 8, fontSize: 12, color: C.sub },

  label: { fontSize: 16, fontWeight: "800", color: C.text, marginTop: 4, marginBottom: 8 },

  selectWrap: {
    position: "relative",
    backgroundColor: C.cardBg,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    marginBottom: 14,
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

  imageButton: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 },
  imageButtonText: { color: C.primary, fontSize: 16, fontWeight: "700" },

  imagePreviewContainer: {
    width: 220,
    height: 220,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
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

  fixedButton: {
    position: "absolute",
    bottom: 8,
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
