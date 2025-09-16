import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { auth } from "../../src/firebase"; // adjust path if needed
import { signOut } from "firebase/auth";
import { router } from "expo-router";

const Profile: React.FC = () => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert("Logged out", "You have been signed out successfully.");
      router.replace("/login"); // redirect to login screen
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.info}>Email: {auth.currentUser?.email || "N/A"}</Text>

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    padding: 16,
    backgroundColor: "#fff"
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
  info: { fontSize: 16, marginBottom: 20 },
  button: { 
    backgroundColor: "#FF3B30", 
    padding: 15, 
    borderRadius: 8, 
    marginTop: 20 
  },
  buttonText: { 
    color: "#fff", 
    fontWeight: "bold", 
    fontSize: 16 
  },
});

export default Profile;
