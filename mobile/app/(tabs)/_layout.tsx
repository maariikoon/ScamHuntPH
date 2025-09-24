// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { View, TouchableOpacity } from "react-native";
import { useNotifications } from "../../src/context/NotificationsContext";


function BellIcon() {
  const router = useRouter();
  const { unreadCount, refresh } = useNotifications(); // 👈 get unread count
  //console.log("🔔 BellIcon rendered, unread:", unreadCount);

  return (
    <TouchableOpacity
      onPress={() => {
        router.push("/alerts");
        refresh(); // refresh notifications when opening alerts
      }}
    >
      <View>
        <Ionicons name="notifications-outline" size={30} color="#007AFF" />
        {unreadCount > 0 && (
          <View
            style={{
              position: "absolute",
              right: -2,
              top: -2,
              backgroundColor: "red",
              borderRadius: 6,
              width: 12,
              height: 12,
            }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#007AFF",
        tabBarStyle: {
          paddingBottom: insets.bottom > 0 ? insets.bottom : 6,
          height: 60 + insets.bottom,
        },
        // 👇 Add BellIcon to the top-right of every tab header
        headerRight: () => (
          <View style={{ marginRight: 12 }}>
            <BellIcon />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "Report",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="create-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
