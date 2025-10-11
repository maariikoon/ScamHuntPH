import { useEffect, useRef } from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import "../i18n"; // side-effect import (resources, detectors, etc.)
import { initI18n } from "../i18n";
import { NotificationsProvider } from "../src/context/NotificationsContext";
import ShareMenu from "react-native-share-menu";

declare global {
  var sharedText: string | null | undefined;
}

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const busyRef = useRef(false);
  const lastTxtRef = useRef<string | null>(null);

  useEffect(() => {
    void initI18n();
  }, []);

  useEffect(() => {
    let mounted = true;
    console.log("🟢 ShareMenu listener mounted");

    async function handleShare(share?: any) {
      console.log("⚡ handleShare called with:", share);
      console.log("🧠 Raw share object:", JSON.stringify(share, null, 2));
      if (!mounted) return;

      // ✅ FIX: Safely extract message regardless of structure
      const txt =
        typeof share === "string"
          ? share.trim()
          : typeof share?.text === "string"
          ? share.text.trim()
          : share?.text?.data?.trim?.() ||
            share?.data?.trim?.() || // 👈 added this line
            "";

      if (!txt) {
        console.log("🚫 No text in share");
        return;
      }

      if (busyRef.current || lastTxtRef.current === txt) {
        console.log("⚠️ Duplicate share ignored");
        return;
      }

      busyRef.current = true;
      lastTxtRef.current = txt;
      global.sharedText = txt;
      console.log("✅ Set global.sharedText:", txt);

      // ⚡ Small delay to ensure React bridge is ready before navigation
      setTimeout(() => {
        if (pathname !== "/report") {
          console.log("➡️ Navigating to /report");
          router.replace("/report");
        }
        setTimeout(() => {
          busyRef.current = false;
          console.log("🧹 Reset busyRef");
        }, 400);
      }, 500);
    }

    // 1️⃣ Cold-start share check
    setTimeout(() => {
      ShareMenu.getSharedText((text) => {
        console.log("📩 getSharedText returned:", text);
        // 👇 Wrap in same shape so handleShare works consistently
        handleShare(text ? { text } : undefined);
      });
    }, 800);

    // 2️⃣ Live share listener
    const sub = ShareMenu.addNewShareListener((share) => {
      console.log("📥 addNewShareListener fired:", share);
      handleShare(share);
    });

    return () => {
      mounted = false;
      sub?.remove?.();
      console.log("🧹 ShareMenu listener cleanup");
    };
  }, [pathname, router]);

  return (
    <NotificationsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </NotificationsProvider>
  );
}
