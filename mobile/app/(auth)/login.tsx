import { JSX, useRef, useState } from "react";
import {
  SafeAreaView,
} from "react-native-safe-area-context";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  signInWithEmailAndPassword,
  UserCredential,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../../src/firebase";
import { MobileApi } from "../../src/utils/api";
import { Ionicons } from "@expo/vector-icons";

/* ---- Theme ---- */
const C = {
  bg: "#ffffff",
  text: "#0f172a",
  sub: "#64748b",
  line: "#e5e7eb",
  primary: "#2563eb",       // web admin blue vibe
  primaryDark: "#1e40af",
  danger: "#ef4444",
  card: "#f8fafc",
};

export default function Login(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const router = useRouter();
  const pwRef = useRef<TextInput>(null);

  const handleLogin = async (): Promise<void> => {
    const e = email.trim().toLowerCase();
    const p = password;

    if (!e || !p) {
      setErr("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(auth, e, p);
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
        friendlyMessage = "Too many failed attempts. Please wait a few minutes.";
      }
      setErr(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const e = email.trim().toLowerCase();
    if (!e) {
      Alert.alert("Forgot Password", "Please enter your email first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, e, {
        url: "https://scamhuntph-b3485.web.app/reset-password",
        handleCodeInApp: true,
      });
      Alert.alert("📧 Email Sent", "Check your inbox for the password reset link.");
    } catch (err: any) {
      console.error("❌ Forgot password error:", err);
      Alert.alert("Error", err.message);
    }
  };

  const disabled = loading || !email.trim() || !password;

  return (
    <SafeAreaView style={S.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={S.wrap}>
          {/* Header */}
          <View style={{ alignItems: "center", marginBottom: 18 }}>
            <Text style={S.title}>Welcome back</Text>
            <Text style={S.subtitle}>Sign in to continue</Text>
          </View>

          {/* Card */}
          <View style={S.card}>
            {/* Email */}
            <View style={S.fieldWrap}>
              <View style={S.leadingIcon}>
                <Ionicons name="mail-outline" size={18} color={C.sub} />
              </View>
              <TextInput
                style={S.input}
                placeholder="Email"
                placeholderTextColor={C.sub}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (err) setErr(null);
                }}
                onSubmitEditing={() => pwRef.current?.focus()}
                accessibilityLabel="Email address"
              />
            </View>

            {/* Password */}
            <View style={S.fieldWrap}>
              <View style={S.leadingIcon}>
                <Ionicons name="lock-closed-outline" size={18} color={C.sub} />
              </View>
              <TextInput
                ref={pwRef}
                style={S.input}
                placeholder="Password"
                placeholderTextColor={C.sub}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (err) setErr(null);
                }}
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                accessibilityLabel="Password"
              />
              <TouchableOpacity
                style={S.trailingIcon}
                onPress={() => setShowPassword((s) => !s)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={C.sub} />
              </TouchableOpacity>
            </View>

            {/* Inline error */}
            {err ? <Text style={S.error}>{err}</Text> : null}

            {/* Login button */}
            <TouchableOpacity
              style={[S.btn, disabled && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={disabled}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={S.btnText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Links */}
            <TouchableOpacity onPress={handleForgotPassword} style={{ marginTop: 10 }}>
              <Text style={S.link}>Forgot your password?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace("/(auth)/signup")} style={{ marginTop: 6 }}>
              <Text style={S.link}>Don&#39;t have an account? Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---- Styles ---- */
const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  wrap: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },

  title: { fontSize: 28, fontWeight: "800", color: C.text },
  subtitle: { fontSize: 14, color: C.sub, marginTop: 4 },

  card: {
    marginTop: 16,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },

  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    borderRadius: 12,
    height: 50,
    marginBottom: 12,
    paddingRight: 12,
  },
  leadingIcon: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  trailingIcon: {
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  input: {
    flex: 1,
    color: C.text,
    fontSize: 16,
  },

  error: {
    color: C.danger,
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 8,
  },

  btn: {
    backgroundColor: C.primary,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  link: { color: C.primary, textAlign: "center", fontWeight: "600" },
});
