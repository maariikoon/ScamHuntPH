import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // mark as mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // only navigate after mount
  useEffect(() => {
    if (mounted) {
      router.replace("/login"); // or "/auth/login" depending on your folder
    }
  }, [mounted]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}
