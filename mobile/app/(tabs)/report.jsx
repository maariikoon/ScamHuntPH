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

export default function Report() {
  const [message, setMessage] = useState("");
  const [sender, setSender] = useState("");
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
    if (!message.trim()) {
      Alert.alert("Error", "Message is required.");
      return;
    }
    setLoading(true);

    try {
      let evidenceUrl = null;

      if (image) {
        const formData = new FormData();
        formData.append("file", {
          uri: image,
          type: "image/jpeg",
          name: "evidence.jpg",
        });
        const uploadRes = await fetch("http://192.168.1.12:4000/uploads/evidence", {
          method: "POST",
          headers: { "Content-Type": "multipart/form-data" },
          body: formData,
        });
        const uploadJson = await uploadRes.json();
        evidenceUrl = uploadJson.url;
        console.log("✅ Evidence uploaded:", evidenceUrl);
      }

      const response = await fetch("http://192.168.1.12:4000/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageText: message,
          sender,
          evidenceUrls: evidenceUrl ? [evidenceUrl] : [],
        }),
      });

      const text = await response.text();
      console.log("Raw server response:", text);

      try {
        const reportJson = JSON.parse(text);
        console.log("Parsed JSON:", reportJson);

        if (response.ok) {
          Alert.alert("Success", "Report submitted for review.");
          setMessage("");
          setSender("");
          setImage(null);
        } else {
          throw new Error(reportJson.error || "Failed to submit report");
        }
      } catch (err) {
        console.error("JSON parse failed:", err, "\nRaw response:", text);
        Alert.alert("Server Error", "Invalid response from the server. Check console logs.");
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
        placeholder="Paste scam message here..."
        multiline
        value={message}
        onChangeText={setMessage}
      />

      <TextInput
        style={styles.input}
        placeholder="Sender (phone/email)"
        value={sender}
        onChangeText={setSender}
      />

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
  button: {
    backgroundColor: "#007AFF", padding: 15,
    borderRadius: 8, alignItems: "center", marginTop: 12
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  imageButton: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  imageButtonText: { marginLeft: 8, color: "#007AFF", fontSize: 16 },
});
