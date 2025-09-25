// mobile/app/profile/account-settings.tsx
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../src/firebase";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { Picker } from "@react-native-picker/picker";

const db = getFirestore();

export default function AccountSettings() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [region, setRegion] = useState("NCR");

  const clearForm = () => {
    setFirstName("");
    setLastName("");
    setBirthday("");
    setRegion("NCR");
  };

  const saveChanges = async () => {
    const user = auth.currentUser;
    if (!user) return;

    Alert.alert(
      "Confirm Save",
      "Your profile info will be updated. By saving, you agree that your data may be used according to our Privacy Policy.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            await setDoc(
              doc(db, "users", user.uid),
              { firstName, lastName, birthday, region },
              { merge: true }
            );
            Alert.alert("✅ Success", "Your account settings have been updated.");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Account Settings</Text>

        <TextInput
          style={styles.input}
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
        />
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          value={lastName}
          onChangeText={setLastName}
        />
        <TextInput
          style={styles.input}
          placeholder="Birthday (YYYY-MM-DD)"
          value={birthday}
          onChangeText={setBirthday}
        />
        <Picker
          selectedValue={region}
          style={styles.input}
          onValueChange={(v) => setRegion(v)}
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

        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.button, { backgroundColor: "#ccc" }]} onPress={clearForm}>
            <Text>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: "#007AFF" }]} onPress={saveChanges}>
            <Text style={{ color: "#fff" }}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  btnRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  button: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
  },
});
