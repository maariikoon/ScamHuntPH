// app/_layout.tsx
import { useEffect } from "react";
import { Stack } from "expo-router";
import "../i18n";              // side-effect import (resources, detectors, etc.)
import { initI18n } from "../i18n";
import { NotificationsProvider } from "../src/context/NotificationsContext";

export default function RootLayout() {
  useEffect(() => {
    // Initialize i18n once on app start (reads device/storage preference)
    // If initI18n returns a Promise, we can just call it and ignore.
    void initI18n();
  }, []);

  return (
    <NotificationsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </NotificationsProvider>
  );
}
