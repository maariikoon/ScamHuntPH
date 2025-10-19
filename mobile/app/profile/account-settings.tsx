// app/profile/account-settings.tsx (adjust the path/filename as needed)
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../src/firebase";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { Picker } from "@react-native-picker/picker";
// If this screen lives in app/profile/, the correct import is usually "../../components/LanguagePicker"
import LanguagePicker from "../components/LanguagePicker";
 // ← adjust if your folder structure differs
import { useTranslation } from "react-i18next";
import { useNavigation } from "expo-router";

const db = getFirestore();

/* ---------- Theme ---------- */
const C = {
  bg: "#ffffff",
  text: "#0f172a",
  sub: "#64748b",
  line: "#e5e7eb",
  fieldBg: "#f8fafc",
  primary: "#2563eb",
  primaryDark: "#1e40af",
};

/* ---------- Utils ---------- */
function isValidBirthday(v: string) {
  if (!v) return true; // optional
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (!m) return false;
  const y = +m[1],
    mo = +m[2],
    d = +m[3];
  const dt = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() + 1 === mo &&
    dt.getUTCDate() === d &&
    y >= 1900 &&
    y <= 2100
  );
}

export default function AccountSettings() {
  const navigation = useNavigation();
  const { t } = useTranslation();

  // ✅ translated Stack header (auto-updates when language changes)
  useEffect(() => {
    navigation.setOptions({
      title: t("profile.accountSettings", { defaultValue: "Account Settings" }),
    });
  }, [navigation, t]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [region, setRegion] = useState("NCR");
  const [saving, setSaving] = useState(false);

  const [initial, setInitial] = useState({
    firstName: "",
    lastName: "",
    birthday: "",
    region: "NCR",
  });

  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.exists() ? (snap.data() as any) : {};
        const start = {
          firstName: String(data.firstName ?? ""),
          lastName: String(data.lastName ?? ""),
          birthday: String(data.birthday ?? ""),
          region: String(data.region ?? "NCR"),
        };
        setInitial(start);
        setFirstName(start.firstName);
        setLastName(start.lastName);
        setBirthday(start.birthday);
        setRegion(start.region);
      } catch {
        // ignore errors
      }
    })();
  }, []);

  const clearForm = () => {
    setFirstName("");
    setLastName("");
    setBirthday("");
    setRegion("NCR");
  };

  const dirty = useMemo(() => {
    return (
      firstName !== initial.firstName ||
      lastName !== initial.lastName ||
      birthday !== initial.birthday ||
      region !== initial.region
    );
  }, [firstName, lastName, birthday, region, initial]);

  const valid = isValidBirthday(birthday);

  const saveChanges = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!valid) {
      Alert.alert(
        t("account.invalidDateTitle", { defaultValue: "Invalid date" }),
        t("account.invalidDateMsg", {
          defaultValue: "Please enter a valid date in YYYY-MM-DD format.",
        })
      );
      return;
    }

    Alert.alert(
      t("account.confirmSaveTitle", { defaultValue: "Save changes?" }),
      t("account.confirmSaveMsg", {
        defaultValue: "Do you want to save your account changes?",
      }),
      [
        { text: t("common.cancel", { defaultValue: "Cancel" }), style: "cancel" },
        {
          text: t("common.confirm", { defaultValue: "Confirm" }),
          onPress: async () => {
            try {
              setSaving(true);
              await setDoc(
                doc(db, "users", user.uid),
                { firstName, lastName, birthday, region },
                { merge: true }
              );
              setInitial({ firstName, lastName, birthday, region });
              Alert.alert("✅", t("account.successMsg", { defaultValue: "Saved successfully." }));
            } catch (e: any) {
              Alert.alert(
                t("common.error", { defaultValue: "Error" }),
                e?.message ?? t("account.saveError", { defaultValue: "Failed to save changes." })
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={S.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={S.scroll} keyboardShouldPersistTaps="handled">
          {/* Language switcher */}
          <View style={{ alignItems: "flex-end", marginBottom: 8 }}>
            <LanguagePicker />
          </View>

          <Text style={S.title}>
            {t("account.title", { defaultValue: "Account Settings" })}
          </Text>
          <Text style={S.subtitle}>
            {t("account.subtitle", {
              defaultValue: "Update your personal information and region.",
            })}
          </Text>

          {/* First Name */}
          <Text style={S.label}>
            {t("account.firstName", { defaultValue: "First Name" })}
          </Text>
          <View style={S.fieldWrap}>
            <Ionicons name="person-outline" size={18} color={C.primaryDark} style={S.leading} />
            <TextInput
              style={S.input}
              placeholder={t("account.firstNamePh", { defaultValue: "Juan" })}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Last Name */}
          <Text style={S.label}>
            {t("account.lastName", { defaultValue: "Last Name" })}
          </Text>
          <View style={S.fieldWrap}>
            <Ionicons name="person-outline" size={18} color={C.primaryDark} style={S.leading} />
            <TextInput
              style={S.input}
              placeholder={t("account.lastNamePh", { defaultValue: "Dela Cruz" })}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </View>

          {/* Birthday */}
          <Text style={S.label}>
            {t("account.birthdayLabel", { defaultValue: "Birthday (YYYY-MM-DD)" })}
          </Text>
          <View style={[S.fieldWrap, !valid && { borderColor: "#fecaca", backgroundColor: "#fff1f2" }]}>
            <Ionicons name="calendar-outline" size={18} color={C.primaryDark} style={S.leading} />
            <TextInput
              style={S.input}
              placeholder="1995-08-17"
              value={birthday}
              onChangeText={setBirthday}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>
          {!valid && (
            <Text style={S.errorText}>
              {t("account.invalidDateInline", {
                defaultValue: "Please enter a valid date.",
              })}
            </Text>
          )}

          {/* Region */}
          <Text style={S.label}>{t("account.region", { defaultValue: "Region" })}</Text>
          <View style={S.pickerWrap}>
            <Ionicons name="location-outline" size={18} color={C.primaryDark} style={S.leading} />
            <Picker
              selectedValue={region}
              style={S.picker}
              onValueChange={(v) => setRegion(String(v))}
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
              <Picker.Item label="CAR – Cordillera Administrative Region" value="CAR" />
              <Picker.Item
                label="BARMM – Bangsamoro Autonomous Region in Muslim Mindanao"
                value="BARMM"
              />
            </Picker>
          </View>

          {/* Buttons */}
          <View style={S.btnRow}>
            <TouchableOpacity style={[S.button, S.btnGhost]} onPress={clearForm}>
              <Text style={S.btnGhostText}>
                {t("common.clear", { defaultValue: "Clear" })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[S.button, S.btnPrimary, (!dirty || !valid || saving) && { opacity: 0.5 }]}
              onPress={saveChanges}
              disabled={!dirty || !valid || saving}
            >
              <Text style={S.btnPrimaryText}>
                {saving
                  ? t("common.saving", { defaultValue: "Saving..." })
                  : t("common.save", { defaultValue: "Save" })}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 32 },

  title: { fontSize: 22, fontWeight: "800", color: C.text },
  subtitle: { color: C.sub, marginTop: 6, marginBottom: 12 },

  label: { fontSize: 12, fontWeight: "800", color: C.sub, marginTop: 10, marginBottom: 6 },

  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.fieldBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  leading: { marginRight: 8 },
  input: { flex: 1, color: C.text, fontSize: 16 },

  errorText: { color: "#ef4444", marginTop: 6, fontWeight: "600" },

  pickerWrap: {
    backgroundColor: C.fieldBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 8,
    height: 48,
    justifyContent: "center",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  picker: { flex: 1, height: 48 },

  btnRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {
    backgroundColor: "#ffffff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  btnGhostText: { color: C.text, fontWeight: "700" },
  btnPrimary: { backgroundColor: C.primary },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
});
