import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../src/firebase";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  sendPasswordResetEmail,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { useRouter } from "expo-router";

const db = getFirestore();

/* Theme */
const C = {
  bg: "#ffffff",
  text: "#0f172a",
  sub: "#64748b",
  line: "#e5e7eb",
  card: "#f8fafc",
  primary: "#2563eb",
  primaryDark: "#1e40af",
  danger: "#ef4444",
};

export default function PrivacySecurity() {
  const [profileVisible, setProfileVisible] = useState(false);
  const [dataSharing, setDataSharing] = useState(true);
  const [loading, setLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data() as any;
        setProfileVisible(!!d.profileVisible);
        setDataSharing(d.dataSharing !== false);
      }
    })();
  }, []);

  async function savePrefs(patch: any, revert?: () => void) {
    try {
      const user = auth.currentUser;
      if (!user) return;
      await setDoc(doc(db, "users", user.uid), patch, { merge: true });
    } catch {
      Alert.alert("Error", "Failed to save your preference. Please try again.");
      revert?.();
    }
  }

  const handleChangePassword = async () => {
    const user = auth.currentUser;
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      Alert.alert("📧 Email sent", "Check your inbox to reset your password.");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to send reset email.");
    }
  };

  const confirmDelete = () => {
    setDelError(null);
    setPassword("");
    Alert.alert(
      "Delete Account",
      "This will permanently remove your account and data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", style: "destructive", onPress: () => setShowDeleteModal(true) },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      setDelError(null);

      const user = auth.currentUser;
      if (!user || !user.email) {
        setDelError("You must be signed in.");
        return;
      }

      const cred = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, cred);

      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);

      Alert.alert("✅ Account deleted", "We're sorry to see you go.");
      setShowDeleteModal(false);
      router.replace("/(auth)/login");
    } catch (err: any) {
      const msg = String(err?.code || err?.message || "");
      if (msg.includes("wrong-password") || msg.includes("invalid-credential")) {
        setDelError("Incorrect password. Please try again.");
      } else if (msg.includes("too-many-requests")) {
        setDelError("Too many attempts. Please wait and try again.");
      } else {
        setDelError("Failed to delete account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={S.safeArea}>
      <ScrollView contentContainerStyle={S.scroll}>
        {/* Privacy */}
        <Text style={S.sectionHeading}>Privacy</Text>

        <View style={S.card}>
          <ToggleRow
            icon="eye-outline"
            title="Profile visibility"
            subtitle="Control whether your name is shown with your reports (default: anonymous)."
            value={profileVisible}
            onChange={(v) => {
              setProfileVisible(v);
              savePrefs({ profileVisible: v }, () => setProfileVisible(!v));
            }}
          />

          <View style={S.divider} />

          <ToggleRow
            icon="analytics-outline"
            title="Data sharing"
            subtitle="Allow anonymized data to be included in Scam Trends analytics."
            value={dataSharing}
            onChange={(v) => {
              setDataSharing(v);
              savePrefs({ dataSharing: v }, () => setDataSharing(!v));
            }}
          />
        </View>

        {/* Security */}
        <Text style={S.sectionHeading}>Security</Text>
        <TouchableOpacity style={S.navRow} activeOpacity={0.85} onPress={handleChangePassword}>
          <View style={S.rowLeftNav}>
            <Ionicons name="key-outline" size={20} color={C.primary} />
            <View style={{ flex: 1 }}>
              <Text style={S.navTitle}>Change password</Text>
              <Text style={S.navSub}>Send a reset link to your email.</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.sub} />
        </TouchableOpacity>

        {/* Danger Zone */}
        <Text style={[S.sectionHeading, { color: C.danger }]}>Danger zone</Text>
        <TouchableOpacity
          style={[S.navRow, { backgroundColor: "#fff5f5", borderColor: "#fecaca" }]}
          activeOpacity={0.9}
          onPress={confirmDelete}
          disabled={loading}
        >
          <View style={S.rowLeftNav}>
            <Ionicons name="trash-outline" size={20} color={C.danger} />
            <View style={{ flex: 1 }}>
              <Text style={[S.navTitle, { color: C.danger }]}>
                {loading ? "Deleting…" : "Delete my account"}
              </Text>
              <Text style={[S.navSub, { color: C.danger }]}>
                Permanently remove your account and all data.
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.danger} />
        </TouchableOpacity>
      </ScrollView>

      {/* Delete modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={S.modalOverlay}>
          <View style={S.modalCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Ionicons name="warning-outline" size={20} color={C.danger} />
              <Text style={S.modalTitle}>Confirm deletion</Text>
            </View>
            <Text style={S.modalSub}>Enter your password to permanently delete your account.</Text>

            <View style={S.pwWrap}>
              <TextInput
                style={S.pwInput}
                placeholder="Password"
                secureTextEntry={!showPw}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setDelError(null);
                }}
              />
              <TouchableOpacity onPress={() => setShowPw((s) => !s)} hitSlop={10}>
                <Ionicons
                  name={showPw ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={C.sub}
                />
              </TouchableOpacity>
            </View>

            {delError ? <Text style={S.errText}>{delError}</Text> : null}

            <View style={S.modalBtns}>
              <TouchableOpacity
                style={[S.btn, S.btnGhost]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setPassword("");
                  setDelError(null);
                }}
                disabled={loading}
              >
                <Text style={S.btnGhostText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[S.btn, S.btnDanger, (password.length < 6 || loading) && { opacity: 0.5 }]}
                onPress={handleDeleteAccount}
                disabled={password.length < 6 || loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={S.btnDangerText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* Rows */
function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
}: {
  icon: any;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={S.toggleRow}>
      <View style={S.rowLeft}>
        <Ionicons name={icon} size={20} color={C.primary} />
        <View style={S.textCol}>
          <Text style={S.toggleTitle}>{title}</Text>
          <Text style={S.toggleSub}>{subtitle}</Text>
        </View>
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

/* Styles */
const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 28 },

  sectionHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    marginBottom: 12,
    marginTop: 6,
  },

  card: {
    borderRadius: 18,
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: 12,
    gap: 8,
    marginBottom: 18,
    // subtle elevation
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  divider: { height: 1, backgroundColor: C.line, opacity: 0.8, marginVertical: 6 },

  /* Toggle rows */
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 68,
    paddingVertical: 4,
  },
  rowLeft: {
    flex: 1,                       // << keeps switch pinned right
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  textCol: { flex: 1 },            // text column should expand
  toggleTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  toggleSub: { fontSize: 13, color: C.sub, marginTop: 2, flexShrink: 1 }, // << allow wrap

  /* Nav rows */
  navRow: {
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  rowLeftNav: {
    flex: 1,                       // << centers text/chevron vertically & reserves space
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  navTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  navSub: { fontSize: 13, color: C.sub, marginTop: 2 },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: C.text },
  modalSub: { color: C.sub, marginTop: 2, marginBottom: 10 },
  pwWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    height: 48,
  },
  pwInput: { flex: 1, fontSize: 16, color: C.text },
  errText: { color: C.danger, marginTop: 8, fontWeight: "600" },

  modalBtns: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: { backgroundColor: "#fff", borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  btnGhostText: { color: C.text, fontWeight: "800" },
  btnDanger: { backgroundColor: C.danger },
  btnDangerText: { color: "#fff", fontWeight: "800" },
});
