// app/(tabs)/_layout.tsx
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, TouchableOpacity } from "react-native";
import { useNotifications } from "../../src/context/NotificationsContext";

// ✅ BellIcon is now a pure component, only re-renders when props change
type BellIconProps = Readonly<{
  unreadCount: number;
  onPress: () => void;
}>;

function BellIcon({ unreadCount, onPress }: BellIconProps) {
  return (
    <TouchableOpacity onPress={onPress}>
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
  const router = useRouter();
  const { unreadCount, refresh } = useNotifications();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#007AFF",
        tabBarStyle: {
          paddingBottom: insets.bottom > 0 ? insets.bottom : 5,
          height: 60 + insets.bottom,
        },
        // 👇 Use the BellIcon component with props
        headerRight: () => (
          <View style={{ marginRight: 12 }}>
            <BellIcon
              unreadCount={unreadCount}
              onPress={() => {
                router.push("/notifications/notifications");
                refresh();
              }}
            />
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
