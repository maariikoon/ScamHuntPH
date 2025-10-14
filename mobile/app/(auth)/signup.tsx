import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from "react-native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, UserCredential } from "firebase/auth";
import { auth, db } from "../../src/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false); // 👈 controls password rules visibility
  const router = useRouter();

  // enable button only when all good
  const canSubmit =
    email &&
    password &&
    confirmPassword &&
    !emailError &&
    !passwordError &&
    !confirmError;

  // Password rules check
  const rules = [
    { label: "Password must be at least 8 characters", valid: password.length >= 8},
    { label: "At least one uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "At least one lowercase letter", valid: /[a-z]/.test(password) },
    { label: "At least one number", valid: /\d/.test(password) },
    { label: "At least one special character", valid: /[\W_]/.test(password) },
  ];

  // ✅ Email validation
  const validateEmail = (val: string) => {
    setEmail(val);
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(val)) setEmailError("Enter a valid email (e.g. name@example.com)");
    else setEmailError("");
  };

  // ✅ Password validation
  const validatePassword = (val: string) => {
    setPassword(val);
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!regex.test(val)) {
      setPasswordError(
        "Password must be at least 8 characters, include upper, lower, number, special char"
      );
    } else setPasswordError("");
  };

  // ✅ Confirm password validation
  const validateConfirmPassword = (val: string) => {
    setConfirmPassword(val);
    if (val !== password) setConfirmError("Passwords do not match");
    else setConfirmError("");
  };

  const handleSignup = async (): Promise<void> => {
    if (emailError || passwordError || confirmError) {
      Alert.alert("Error", "Please fix validation errors before signing up.");
      return;
    }

    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        createdAt: new Date().toISOString(),
        firstName: "",
        lastName: "",
        birthday: "",
        region: "",
      });

      router.replace("/home");
    } catch (error: any) {
      console.error("❌ Signup failed:", error.message);
      Alert.alert("Signup Failed", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>

      {/* Email */}
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={validateEmail}
      />
      {emailError ? <Text style={styles.error}>{emailError}</Text> : null}

      {/* Password */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={validatePassword}
          onFocus={() => setShowRules(true)}   // show rules when focused
          onBlur={() => setShowRules(false)}   // hide rules when blurred (optional)
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="gray" />
        </TouchableOpacity>
      </View>

      {/* ✅ Password rules with icons (only show when field is active) */}
      {showRules && (
        <View style={{ marginBottom: 8 }}>
          {rules.map((rule, idx) => (
            <View
              key={idx}
              style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}
            >
              <Ionicons
                name={rule.valid ? "checkmark-circle" : "close-circle"}
                size={16}
                color={rule.valid ? "green" : "red"}
                style={{ marginRight: 6 }}
              />
              <Text style={{ color: rule.valid ? "green" : "red", fontSize: 12 }}>
                {rule.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Confirm Password */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          secureTextEntry={!showConfirm}
          value={confirmPassword}
          onChangeText={validateConfirmPassword}
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowConfirm(!showConfirm)}
        >
          <Ionicons name={showConfirm ? "eye-off" : "eye"} size={20} color="gray" />
        </TouchableOpacity>
      </View>
      {confirmError ? <Text style={styles.error}>{confirmError}</Text> : null}

      {/* Signup button */}
      <TouchableOpacity
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={handleSignup}
        disabled={!canSubmit}
      >
        <Text style={styles.buttonText}>Create Account</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20, textAlign: "center" },

  inputContainer: {
    position: "relative",
    marginBottom: 6,
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
    transform: [{ translateY: -10 }], // center vertically
  },

  error: { color: "red", fontSize: 12, marginBottom: 8 },
  button: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: "#ccc", // gray when disabled
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  link: { marginTop: 12, color: "#007AFF", textAlign: "center" },
});
