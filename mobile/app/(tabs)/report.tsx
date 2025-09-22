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

  const pickImage = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // 🔹 Ask backend for signed URL
  async function getSignedUrl(token: string, filename: string) {
    const res = await fetch(`${API_BASE_URL}/uploadUrl`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ filename }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Failed to get signed URL");
    return data; // { uploadUrl, readUrl }
  }

  // 🔹 Upload directly to GCS with signed URL
  async function uploadWithSignedUrl(uri: string, uploadUrl: string) {
    const resp = await fetch(uri);
    const blob = await resp.blob();

    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: blob,
    });

    if (!put.ok) throw new Error("Failed to upload file to GCS");
  }

  const handleSubmit = async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) return Alert.alert("Error", "You must be logged in");

    setLoading(true);

    try {
      const token = await user.getIdToken();

      let evidenceUrls: string[] = [];
      if (image) {
        // 1. Request signed URL from backend
        const filename = "screenshot.jpg";
        const { uploadUrl, readUrl } = await getSignedUrl(token, filename);

        // 2. Upload image directly to GCS
        await uploadWithSignedUrl(image, uploadUrl);

        // 3. Store permanent read URL
        evidenceUrls.push(readUrl);
      }

      // 4. Submit report JSON
      const response = await fetch(`${API_BASE_URL}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sender: user.uid,
          email: user.email || "",
          message,
          category,
          region,
          evidenceUrls,
        }),
      });

      const result = await response.json();
      if (response.ok && result.ok) {
        Alert.alert("✅ Success", "Report submitted.");
        setMessage("");
        setImage(null);
      } else {
        throw new Error(result.error || "Submit failed");
      }
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
        <Picker
          selectedValue={category}
          style={styles.picker}
          onValueChange={setCategory}
        >
          <Picker.Item label="Phishing" value="Phishing" />
          <Picker.Item label="Spoofing (Fake GCash, fake Banks)" value="Spoofing" />
          <Picker.Item label="Delivery Fraud" value="Delivery Fraud" />
          <Picker.Item label="Fake Job" value="Fake Job" />
          <Picker.Item label="Loan Scam" value="Loan Scam" />
          <Picker.Item label="Investment Scam" value="Investment Scam" />
          <Picker.Item label="Gcash Scam" value="Gcash Scam" />
          <Picker.Item label="Identity theft" value="Identity theft" />
          <Picker.Item label="Smishing" value="Smishing" />
          <Picker.Item label="Lottery Scams" value="Lottery Scams" />
          <Picker.Item
            label="Impersonation Scam (Fake Person)"
            value="Impersonation Scam (Fake Person)"
          />
          <Picker.Item label="Others" value="Others" />
        </Picker>

        <Text style={styles.label}>Select Region</Text>
        <Picker
          selectedValue={region}
          style={styles.picker}
          onValueChange={setRegion}
        >
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
          <Picker.Item
            label="CAR – Cordillera Administrative Region"
            value="CAR"
          />
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
