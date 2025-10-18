// /i18n/index.ts
import i18n, { type i18n as I18nType } from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Local JSON resources (namespace: common)
import enCommon from "./locales/en/common.json";
import filCommon from "./locales/fil/common.json";

const STORAGE_KEY = "app.language";

// Map device locales to our supported ones
function normalizeDeviceLang(): "en" | "fil" {
  // Newer Expo: getLocales() → [{ languageCode: "en", languageTag: "en-US", ... }]
  let code: string | undefined;
  if (typeof Localization.getLocales === "function") {
    const arr = Localization.getLocales();
    code = arr?.[0]?.languageCode || arr?.[0]?.languageTag?.split?.("-")?.[0];
  }
  // Older fallback: "en-US"
  // @ts-ignore
  code = code || Localization.getLocales()?.[0]?.languageTag?.split?.("-")?.[0] || "en";

  const raw = String(code).toLowerCase();
  return raw === "tl" || raw === "fil" ? "fil" : "en";
}

export async function initI18n(): Promise<I18nType> {
  const persisted = (await AsyncStorage.getItem(STORAGE_KEY)) as "en" | "fil" | null;
  const initial = persisted || normalizeDeviceLang();

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      compatibilityJSON: "v4",
      resources: {
        en: { common: enCommon },
        fil: { common: filCommon },
      },
      lng: initial,
      fallbackLng: "en",
      ns: ["common"],
      defaultNS: "common",
      supportedLngs: ["en", "fil"],
      nonExplicitSupportedLngs: true,
      load: "languageOnly",
      interpolation: { escapeValue: false },
      returnNull: false,
    });
  } else {
    await i18n.changeLanguage(initial);
  }

  return i18n;
}

export async function setAppLanguage(code: "en" | "fil") {
  if (i18n.language !== code) {
    await i18n.changeLanguage(code);
  }
  await AsyncStorage.setItem(STORAGE_KEY, code);
}

export function getCurrentLanguage(): "en" | "fil" {
  return (i18n.language as "en" | "fil") || "en";
}

export default i18n;
