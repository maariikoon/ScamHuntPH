// src/utils/ShareMenuSafe.ts
import { Platform, DeviceEventEmitter, NativeModules } from "react-native";

const { IntentModule } = NativeModules;

// Listen for warm-state events from native
export function addShareListener(onShare: (text: string) => void) {
  if (Platform.OS !== "android") {
    return { remove() {} };
  }
  // Subscribe to DeviceEventEmitter because native emits via RCTDeviceEventEmitter
  const sub = DeviceEventEmitter.addListener("ShareText", (payload: any) => {
    // payload can be a string, or { text } or { data }
    const txt =
      typeof payload === "string"
        ? payload
        : payload?.text ?? payload?.data ?? "";
    if (typeof txt === "string" && txt.trim().length > 0) {
      onShare(txt.trim());
    }
  });
  console.log("🛰️ Listening for native ShareText events…");
  return sub; // keep this subscription alive
}

// Get the initial text on cold start (native module returns lastSharedText / pending flush)
export async function getInitialShare(): Promise<string | null> {
  if (Platform.OS !== "android") return null;
  try {
    const txt = await IntentModule?.getInitialText?.();
    console.log("📩 getInitialShare (intent extras):", txt ?? null);
    return typeof txt === "string" && txt.trim() ? txt.trim() : null;
  } catch (e) {
    console.warn("getInitialShare error", e);
    return null;
  }
}
