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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

const db = getFirestore();

export default function PrivacySecurity() {
  const [profileVisible, setProfileVisible] = useState(false);
  const [dataSharing, setDataSharing] = useState(true);
  const [loading, setLoading] = useState(false);

  // state for delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    async function loadPrefs() {
      const user = auth.currentUser;
      if (!user) return;
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data();
        setProfileVisible(!!d.profileVisible);
        setDataSharing(d.dataSharing !== false); // default true
      }
    }
    loadPrefs();
  }, []);

  async function savePrefs(newPrefs: any) {
    const user = auth.currentUser;
    if (!user) return;
    await setDoc(doc(db, "users", user.uid), newPrefs, { merge: true });
  }

  async function handleChangePassword() {
    const user = auth.currentUser;
    if (!user?.email) return;

    try {
      await sendPasswordResetEmail(auth, user.email, {
        url: "https://scamhuntph-b3485.web.app/reset-password",
        handleCodeInApp: true,
      });
      Alert.alert("📧 Email Sent", "Check your inbox to reset your password.");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
}

  const confirmDelete = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account and all associated data?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", style: "destructive", onPress: () => setShowDeleteModal(true) },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user || !user.email) return;

      // reauthenticate with password
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // delete user doc first
      await deleteDoc(doc(db, "users", user.uid));

      // delete auth user
      await deleteUser(user);

      Alert.alert("✅ Account Deleted", "Your account has been removed.");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setPassword("");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Privacy Section */}
        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Profile Visibility</Text>
            <Text style={styles.description}>
              Control if your name is shown with your reports. By default,
              reports are anonymous.
            </Text>
          </View>
          <Switch
            value={profileVisible}
            onValueChange={(v) => {
              setProfileVisible(v);
              savePrefs({ profileVisible: v });
            }}
          />
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Data Sharing</Text>
            <Text style={styles.description}>
              Allow your anonymized data to be included in scam trend analytics.
            </Text>
          </View>
          <Switch
            value={dataSharing}
            onValueChange={(v) => {
              setDataSharing(v);
              savePrefs({ dataSharing: v });
            }}
          />
        </View>

        {/* Security Section */}
        <Text style={styles.sectionTitle}>Security</Text>
        <TouchableOpacity style={styles.listItem} onPress={handleChangePassword}>
          <Text style={styles.listText}>Change Password</Text>
          <Text style={styles.description}>
            Send a reset link to your email to create a new password.
          </Text>
        </TouchableOpacity>

        {/* Spacer before Danger Zone */}
        <View style={{ marginTop: 24, borderTopWidth: 1, borderColor: "#eee" }} />

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { color: "red" }]}>Danger Zone</Text>
        <TouchableOpacity
          style={[styles.listItem, { backgroundColor: "#f8d7da" }]}
          onPress={confirmDelete}
          disabled={loading}
        >
          <Text style={[styles.listText, { color: "red" }]}>
            {loading ? "Deleting..." : "Delete My Account"}
          </Text>
          <Text style={[styles.description, { color: "red" }]}>
            Permanently remove your account and all associated data.
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal for password input */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
              Confirm Deletion
            </Text>
            <Text style={{ fontSize: 14, color: "#666", marginBottom: 12 }}>
              Please enter your password to confirm account deletion.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#ccc" }]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setPassword("");
                }}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "red" }]}
                onPress={handleDeleteAccount}
                disabled={loading}
              >
                <Text style={{ color: "#fff" }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: "600", marginVertical: 12 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  label: { fontSize: 16, fontWeight: "500" },
  description: { fontSize: 12, color: "#666", marginTop: 4 },
  listItem: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  listText: { fontSize: 16, fontWeight: "500" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalBtn: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
  },
});
