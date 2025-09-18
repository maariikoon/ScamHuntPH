import { useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { JSX } from "react/jsx-runtime";
import * as FileSystem from "expo-file-system";
import { auth } from "../../src/firebase"; 

const API_BASE_URL = "https://scamhunt-bcvrqgcc6a-as.a.run.app";

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

  const handleSubmit = async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in to submit a report.");
      return;
    }

    if (!message.trim()) {
      Alert.alert("Error", "Message is required.");
      return;
    }

    setLoading(true);

    try {
      const sender = user.uid;         // 👈 stored in Firestore
      const email = user.email || "";  // optional
      const token = await user.getIdToken();

      // ✅ prepare base64 if screenshot exists
      let base64: string | null = null;
      if (image) {
        base64 = await FileSystem.readAsStringAsync(image, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const response = await fetch(`${API_BASE_URL}/reports`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,   // 🔑 required for backend
        },
        body: JSON.stringify({
          sender,
          email,
          message,
          category,
          region,
          ...(base64 ? { base64 } : {}),  // only include if exists
        }),
      });

      const text = await response.text();
      console.log("Raw server response:", text);

      const reportJson = JSON.parse(text);
      if (response.ok && reportJson.ok) {
        Alert.alert("✅ Success", "Report submitted for review.");
        setMessage("");
        setCategory("Phishing");
        setRegion("NCR");
        setImage(null);
      } else {
        throw new Error(reportJson.error || "Failed to submit report");
      }
    } catch (err: any) {
      console.error("❌ Report error:", err.message);
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
        <Picker.Item label="Phishing" value="Phishing" />
        <Picker.Item label="Spoofing (Fake GCash, fake Banks)" value="Spoofing" />
        <Picker.Item label="Delivery Fraud" value="Delivery Fraud" />
        <Picker.Item label="Fake Job" value="Fake Job" />
        <Picker.Item label="Loan Scam" value="Loan Scam" />
        <Picker.Item label="Investment Scam" value="Investment Scam" />
        <Picker.Item label="Gcash Scam" value="Gcash Scam" />
        <Picker.Item label="Identity theft" value="Identity theft" />
        <Picker.Item label="Smishing" value="Smishing" />
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
        <Picker.Item label="BARMM – Bangsamoro Autonomous Region in Muslim Mindanao" value="BARMM" />
      </Picker>

      <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
        <Ionicons name="image-outline" size={20} color="#007AFF" />
        <Text style={styles.imageButtonText}>
          {image ? "Change Screenshot" : "Attach Screenshot"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.5 }]}
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
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  label: { fontSize: 16, fontWeight: "600", marginTop: 10 },
  picker: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  imageButton: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  imageButtonText: { marginLeft: 8, color: "#007AFF", fontSize: 16 },
});
