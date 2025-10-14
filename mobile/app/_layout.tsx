import { useEffect, useRef } from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import "../i18n"; // side-effect import (resources, detectors, etc.)
import { initI18n } from "../i18n";
import { NotificationsProvider } from "../src/context/NotificationsContext";
//import ShareMenu from "react-native-share-menu";
import { getInitialShare, addShareListener } from "../src/utils/ShareMenuSafe";

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
      if (!mounted) return;

      const txt =
        typeof share === "string"
          ? share.trim()
          : typeof share?.text === "string"
          ? share.text.trim()
          : share?.text?.data?.trim?.() ||
            share?.data?.trim?.() ||
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

    // ✅ Cold-start share check using safe wrapper
    setTimeout(async () => {
      const data = await getInitialShare();
      console.log("📩 getInitialShare returned:", data);
      if (data) handleShare(data);
    }, 800);

    // ✅ Live share listener using safe wrapper
    addShareListener((share) => {
      console.log("📥 addShareListener fired:", share);
      handleShare(share);
    });

    return () => {
      mounted = false;
      console.log("🧹 ShareMenu listener cleanup");
    };
  }, [pathname, router]);

  return (
    <NotificationsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </NotificationsProvider>
  );
}
