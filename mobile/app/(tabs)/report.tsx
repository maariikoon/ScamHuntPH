import { JSX, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { auth } from "../../src/firebase";

const API_BASE_URL = "https://reports-bcvrqgcc6a-as.a.run.app";

export default function Report(): JSX.Element {
  const [message, setMessage] = useState<string>("");
  const [category, setCategory] = useState<string>("Phishing");
  const [region, setRegion] = useState<string>("NCR");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // 🔹 Pick an image from gallery
  const pickImage = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // 🔹 Step 1: Create report first
  async function createReport(
    token: string,
    message: string,
    category: string,
    region: string
  ): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message, category, region }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Failed to create report");
    return data.id as string;
  }

  // 🔹 Step 2: Ask backend for signed URL (now includes reportId)
  async function getSignedUrl(token: string, reportId: string, filename: string) {
    const res = await fetch(`${API_BASE_URL}/uploadUrl`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reportId, filename }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Failed to get signed URL");
    return data; // { uploadUrl, readUrl }
  }

  // 🔹 Step 3: Upload directly to GCS
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

  // 🔹 Step 4: Patch report to attach evidence
  async function addEvidence(token: string, reportId: string, url: string) {
    const res = await fetch(`${API_BASE_URL}/${reportId}/evidence`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Failed to attach evidence");
  }

  // 🔹 Submit flow (new order)
  const handleSubmit = async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) return Alert.alert("Error", "You must be logged in");

    setLoading(true);

    try {
      const token = await user.getIdToken();

      // 1. Create report first
      const reportId = await createReport(token, message, category, region);

      // 2. If screenshot selected → upload & attach
      if (image) {
        const filename = "screenshot.jpg";
        const { uploadUrl, readUrl } = await getSignedUrl(token, reportId, filename);

        await uploadWithSignedUrl(image, uploadUrl);

        await addEvidence(token, reportId, readUrl);
      }

      Alert.alert("✅ Success", "Report submitted.");
      setMessage("");
      setImage(null);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Report a Scam</Text>

        <TextInput
          style={styles.input}
          placeholder="Paste scam message here..."
          multiline
          value={message}
          onChangeText={setMessage}
        />

        <Text style={styles.label}>Select Category</Text>
        <Picker selectedValue={category} style={styles.picker} onValueChange={setCategory}>
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

        <Text style={styles.label}>Select Region</Text>
        <Picker selectedValue={region} style={styles.picker} onValueChange={setRegion}>
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
          <Picker.Item
            label="BARMM – Bangsamoro Autonomous Region in Muslim Mindanao"
            value="BARMM"
          />
        </Picker>

        {image ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: image }} style={styles.imagePreview} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setImage(null)}
            >
              <Ionicons name="close-circle" size={28} color="red" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            <Ionicons name="image-outline" size={20} color="#007AFF" />
            <Text style={styles.imageButtonText}>Attach Screenshot</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* fixed submit button */}
      <TouchableOpacity
        style={[styles.fixedButton, loading && { opacity: 0.5 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Submitting..." : "Submit Report"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    textAlignVertical: "top",
  },
  label: { fontSize: 16, fontWeight: "600", marginTop: 10 },
  picker: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 12,
  },
  fixedButton: {
    position: "absolute",
    bottom: 5,
    left: 10,
    right: 10,
    backgroundColor: "#007AFF",
    padding: 13,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  imageButton: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  imageButtonText: { marginLeft: 8, color: "#007AFF", fontSize: 16 },
  imagePreviewContainer: {
    position: "relative",
    marginBottom: 12,
    alignItems: "center",
  },
  imagePreview: {
    width: 200,
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  removeImageButton: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: "white",
    borderRadius: 50,
  },
});
