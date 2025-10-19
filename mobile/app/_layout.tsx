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
    const txt0 = extractSharedText(raw);
    const txt = normalize(txt0);
    if (!txt) return log("📭 No share text found, ignoring.");
    if (busyRef.current || lastTxtRef.current === txt) return log("⚠️ Share ignored (busy/duplicate).");

    busyRef.current = true;
    lastTxtRef.current = txt;
    global.sharedText = txt;

    const go = () => {
      if (pathname !== "/report") {
        try { router.replace("/report"); } catch (e) { warn("Router replace failed:", e); }
      }
      const t2 = setTimeout(() => { busyRef.current = false; }, BUSY_RESET_MS);
      timersRef.current.push(t2);
    };
    const t1 = setTimeout(go, NAV_DELAY_MS);
    timersRef.current.push(t1);
  }, [pathname, router]);

  useEffect(() => {
    if (!ready) return;
    let mounted = true;
    const t = setTimeout(async () => {
      if (!mounted) return;
      try {
        const initial = await getInitialShare();
        if (initial) handleShare(initial);
      } catch (e) { warn("getInitialShare failed:", e); }
    }, COLD_START_DELAY_MS);
    timersRef.current.push(t);

    let unsubscribe: (() => void) | undefined;
    try {
      addShareListener((share: any) => { if (mounted) handleShare(share); });
      unsubscribe = undefined;
    } catch (e) { warn("addShareListener failed:", e); }

    return () => {
      mounted = false;
      if (typeof unsubscribe === "function") unsubscribe();
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
