import React, { useCallback, useEffect, useRef } from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import "../i18n"; // side-effect import
import { initI18n } from "../i18n";
import { NotificationsProvider } from "../src/context/NotificationsContext";
// import ShareMenu from "react-native-share-menu";
import { getInitialShare, addShareListener } from "../src/utils/ShareMenuSafe";

declare global {
  // Kept for backwards-compat with your /report screen
  var sharedText: string | null | undefined;
}

/* ---------- Tunables ---------- */
const NAV_DELAY_MS = 500;      // delay before navigating to /report
const BUSY_RESET_MS = 400;     // delay to release busy lock after nav
const COLD_START_DELAY_MS = 800; // delay before checking initial share on cold start

/* ---------- Helpers ---------- */
function extractSharedText(share: any): string {
  // Known shapes: string, { text }, { data }, { text: { data } }, { message }
  if (!share) return "";
  if (typeof share === "string") return share.trim();

  // Common fields from various share menu libs/platforms
  const candidates: unknown[] = [
    share.text,
    share.data,
    share.message,
    share?.text?.data,
    share?.content,           // sometimes present on Android
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }

  // As a last resort try to stringify small objects safely
  try {
    const s = JSON.stringify(share);
    return s.length <= 400 ? s : "";
  } catch {
    return "";
  }
}

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  // Re-entrancy + dedupe guards
  const busyRef = useRef(false);
  const lastTxtRef = useRef<string | null>(null);

  // Timers to clear on unmount
  const timersRef = useRef<number[]>([]);

  /* ---------- i18n one-time init ---------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await initI18n();
      } catch (e) {
        console.warn("[i18n] init failed:", e);
      }
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- Share handling ---------- */
  const handleShare = useCallback(
    (raw?: any) => {
      const txt = extractSharedText(raw);
      if (!txt) {
        console.log("📭 No share text found, ignoring.");
        return;
      }

      // Dedupe same payload back-to-back
      if (busyRef.current || lastTxtRef.current === txt) {
        console.log("⚠️ Share ignored (busy or duplicate).");
        return;
      }

      busyRef.current = true;
      lastTxtRef.current = txt;
      global.sharedText = txt;
      console.log("✅ sharedText set:", txt);

      // If already on /report, don't re-navigate (but still reset busy later)
      const go = () => {
        if (pathname !== "/report") {
          console.log("➡️ Navigating to /report");
          try {
            router.replace("/report");
          } catch (e) {
            console.warn("Router replace failed:", e);
          }
        } else {
          console.log("ℹ️ Already on /report; not re-navigating.");
        }

        const t2 = setTimeout(() => {
          busyRef.current = false;
          console.log("🧹 busyRef released");
        }, BUSY_RESET_MS) as unknown as number;
        timersRef.current.push(t2);
      };

      const t1 = setTimeout(go, NAV_DELAY_MS) as unknown as number;
      timersRef.current.push(t1);
    },
    [pathname, router]
  );

  useEffect(() => {
    let mounted = true;
    console.log("🟢 Share listeners mounting…");

    // Cold start (Android/iOS) — safe wrapper you provided
    const t = setTimeout(async () => {
      if (!mounted) return;
      try {
        const initial = await getInitialShare();
        console.log("📩 initial share:", initial);
        if (initial) handleShare(initial);
      } catch (e) {
        console.warn("getInitialShare failed:", e);
      }
    }, COLD_START_DELAY_MS) as unknown as number;
    timersRef.current.push(t);

    // Live listener — expect an unsubscribe if available
    let unsubscribe: (() => void) | undefined;
    try {
      addShareListener((share: any) => {
        console.log("📥 live share:", share);
        if (mounted) handleShare(share);
      });
      unsubscribe = undefined; // Explicitly set to undefined since no cleanup function is returned
    } catch (e) {
      console.warn("addShareListener failed:", e);
    }

    return () => {
      mounted = false;
      if (typeof unsubscribe === "function") {
        try {
          unsubscribe();
          console.log("🔕 Share listener unsubscribed");
        } catch (e) {
          console.warn("Unsubscribe failed:", e);
        }
      }
      // clear pending timers
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
      console.log("🧹 RootLayout cleanup complete");
    };
  }, [handleShare]);

  return (
    <NotificationsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </NotificationsProvider>
  );
}
