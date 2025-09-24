// app/_layout.jsx
import { Stack } from "expo-router";
import { NotificationsProvider } from "../src/context/NotificationsContext";

export default function RootLayout() {
  return (
    <NotificationsProvider>   {/* 👈 wrap here */}
      <Stack screenOptions={{ headerShown: false }} />
    </NotificationsProvider>
  );
}
