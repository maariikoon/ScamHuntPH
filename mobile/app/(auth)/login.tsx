import { JSX, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from "react-native";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword, UserCredential } from "firebase/auth";
import { auth } from "../../src/firebase";
import { MobileApi } from "../../src/utils/api";
import { Ionicons } from "@expo/vector-icons";

export default function Login(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (): Promise<void> => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      console.log("⚠️ Login attempt failed: Missing email or password");
      return;
    }

    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      console.log("✅ User logged in:", userCredential.user.email);
      await MobileApi.heartbeat(true);
      router.replace("/home");
    } catch (error: any) {
      console.error("❌ Login failed:", error.code, error.message);

      let friendlyMessage = "Something went wrong. Please try again.";

      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        friendlyMessage = "Incorrect email or password.";
      } else if (error.code === "auth/user-not-found") {
        friendlyMessage = "No account found with this email.";
      } else if (error.code === "auth/invalid-email") {
        friendlyMessage = "Please enter a valid email address.";
      } else if (error.code === "auth/too-many-requests") {
        friendlyMessage = "Too many failed attempts. Please wait a few minutes before trying again.";
      }

      Alert.alert("Login Failed", friendlyMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Login</Text>

      {/* Email */}
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      {/* Password with eye icon */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="gray" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace("/(auth)/signup")}>
        <Text style={styles.link}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20, textAlign: "center" },

  inputContainer: {
    position: "relative",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    paddingRight: 40, // space for eye icon
    marginBottom: 6,
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -10 }],
  },

  button: { backgroundColor: "#007AFF", padding: 15, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  link: { marginTop: 12, color: "#007AFF", textAlign: "center" },
});
