// app/_layout.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import i18n, { initI18n } from "../i18n";
import { NotificationsProvider } from "../src/context/NotificationsContext";
import { getInitialShare, addShareListener } from "../src/utils/ShareMenuSafe";

declare global {
  // eslint-disable-next-line no-var
  var sharedText: string | null | undefined;
}

const NAV_DELAY_MS = 500;
const BUSY_RESET_MS = 400;
const COLD_START_DELAY_MS = 800;

const log = (...a: any[]) => { if (__DEV__) console.log(...a); };
const warn = (...a: any[]) => { if (__DEV__) console.warn(...a); };

function extractSharedText(share: any): string {
  if (!share) return "";
  if (typeof share === "string") return share.trim();
  const candidates: unknown[] = [share.text, share.data, share.message, share?.text?.data, share?.content];
  for (const c of candidates) if (typeof c === "string" && c.trim()) return c.trim();
  try { const s = JSON.stringify(share); return s.length <= 400 ? s : ""; } catch { return ""; }
}
const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const [ready, setReady] = useState(false);
  const [lang, setLang] = useState<"en" | "fil">("en");

  const mountedRef = useRef(true);
  const busyRef = useRef(false);
  const lastTxtRef = useRef<string | null>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        await initI18n();
        const current = (i18n.language || "en").toLowerCase();
        setLang(current.startsWith("fil") || current.startsWith("tl") ? "fil" : "en");
        console.log("[i18n ready]", i18n.language, i18n.t("tabs.home"));
      } catch (e) {
        warn("[i18n] init failed:", e);
      } finally {
        if (mountedRef.current) setReady(true);
      }
    })();
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const onLang = (l: string) => {
      const norm = (l || "en").toLowerCase();
      setLang(norm.startsWith("fil") || norm.startsWith("tl") ? "fil" : "en");
    };
    i18n.on("languageChanged", onLang);
    return () => { i18n.off("languageChanged", onLang); };
  }, []);

  const handleShare = useCallback((raw?: any) => {
    console.log("🔍 handleShare called with raw:", raw);
    const txt0 = extractSharedText(raw);
    console.log("🔍 Extracted text:", txt0);
    const txt = normalize(txt0);
    console.log("🔍 Normalized text:", txt);
    
    if (!txt) return log("🔭 No share text found, ignoring.");
    
    if (lastTxtRef.current === txt && busyRef.current) {
      console.log("⚠️ Duplicate share detected while busy, ignoring");
      return log("⚠️ Share ignored (busy/duplicate).");
    }

    console.log("✅ Processing share...");
    busyRef.current = true;
    lastTxtRef.current = txt;

    const go = () => {
      console.log("🚀 About to navigate to /share-confirm with:", txt);
      try { 
        router.replace({
          pathname: "/share-confirm",
          params: { message: txt }
        }); 
        console.log("✅ Navigation completed");
      } catch (e) { 
        warn("Router navigation failed:", e); 
      }
      const t2 = setTimeout(() => { 
        busyRef.current = false; 
        console.log("🔓 busyRef reset");
      }, BUSY_RESET_MS);
      timersRef.current.push(t2);
    };
    const t1 = setTimeout(go, NAV_DELAY_MS);
    timersRef.current.push(t1);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    let mounted = true;
    
    const checkInitial = async () => {
      if (!mounted) return;
      try {
        console.log("🔍 Checking for initial share...");
        const initial = await getInitialShare();
        console.log("🔍 getInitialShare returned:", initial);
        if (initial && mounted) {
          console.log("✅ Found initial share, calling handleShare");
          handleShare(initial);
        }
      } catch (e) { 
        warn("getInitialShare failed:", e); 
      }
    };

    // Check immediately
    checkInitial();
    
    // Also check periodically in case we missed it
    const interval = setInterval(() => {
      if (mounted) checkInitial();
    }, 1000);
    
    console.log("🛰️ Setting up share listener...");
    const subscription = addShareListener((share: any) => { 
      console.log("📨 Share listener triggered with:", share);
      if (mounted) handleShare(share); 
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      if (subscription?.remove) subscription.remove();
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [ready, handleShare]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NotificationsProvider>
      {/* key={lang} ensures labels/headers re-evaluate when language changes */}
      <Stack key={lang} screenOptions={{ headerShown: false }} />
    </NotificationsProvider>
  );
}
