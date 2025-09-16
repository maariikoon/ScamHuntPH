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

const API_BASE_URL = "https://scamhunt-bcvrqgcc6a-as.a.run.app";

export default function Report() {
  const [message, setMessage] = useState("");
  const [sender, setSender] = useState("");
  const [category, setCategory] = useState("Phishing");
  const [region, setRegion] = useState("NCR");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!message.trim() || !sender.trim()) {
      Alert.alert("Error", "Sender and Message are required.");
      return;
    }
    setLoading(true);

    try {
      let evidenceUrl = null;

      // Upload screenshot first if provided
      if (image) {
        const formData = new FormData();
        formData.append("file", {
          uri: image,
          type: "image/jpeg",
          name: "evidence.jpg",
        });

        const uploadRes = await fetch(`${API_BASE_URL}/reports/upload`, {
          method: "POST",
          headers: { "Content-Type": "multipart/form-data" },
          body: formData,
        });
        const uploadJson = await uploadRes.json();
        evidenceUrl = uploadJson.url;
        console.log("✅ Evidence uploaded:", evidenceUrl);
      }

      // Send report data
      const response = await fetch(`${API_BASE_URL}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender,
          message,
          category,
          region,
          evidenceUrls: evidenceUrl ? [evidenceUrl] : [],
          status: "pending",
          createdAt: new Date().toISOString(),
        }),
      });

      const text = await response.text();
      console.log("Raw server response:", text);

      try {
        const reportJson = JSON.parse(text);
        console.log("Parsed JSON:", reportJson);

        if (response.ok) {
          Alert.alert("✅ Success", "Report submitted for review.");
          setMessage("");
          setSender("");
          setCategory("Phishing");
          setRegion("NCR");
          setImage(null);
        } else {
          throw new Error(reportJson.error || "Failed to submit report");
        }
      } catch (err) {
        console.error("JSON parse failed:", err, "\nRaw response:", text);
        Alert.alert("Server Error", "Invalid response from the server.");
      }
    } catch (err) {
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
        placeholder="Sender (phone/email)"
        value={sender}
        onChangeText={setSender}
      />

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
        onValueChange={(itemValue) => setCategory(itemValue)}
      >
        <Picker.Item label="Phishing" value="Phishing" />
        <Picker.Item label="Spoofing (Fake GCash)" value="Spoofing" />
        <Picker.Item label="Delivery Fraud" value="Delivery Fraud" />
        <Picker.Item label="Fake Job" value="Fake Job" />
        <Picker.Item label="Loan Scam" value="Loan Scam" />
        <Picker.Item label="Investment Scam" value="Investment Scam" />
        <Picker.Item label="Others" value="Others" />
      </Picker>

      <Text style={styles.label}>Select Region</Text>
      <Picker
        selectedValue={region}
        style={styles.picker}
        onValueChange={(itemValue) => setRegion(itemValue)}
      >
        <Picker.Item label="NCR" value="NCR" />
        <Picker.Item label="Luzon" value="Luzon" />
        <Picker.Item label="Visayas" value="Visayas" />
        <Picker.Item label="Mindanao" value="Mindanao" />
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
    borderWidth: 1, borderColor: "#ccc", borderRadius: 8,
    padding: 12, marginBottom: 12
  },
  label: { fontSize: 16, fontWeight: "600", marginTop: 10 },
  picker: {
    borderWidth: 1, borderColor: "#ccc", borderRadius: 8,
    marginBottom: 12
  },
  button: {
    backgroundColor: "#007AFF", padding: 15,
    borderRadius: 8, alignItems: "center", marginTop: 12
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  imageButton: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  imageButtonText: { marginLeft: 8, color: "#007AFF", fontSize: 16 },
});
