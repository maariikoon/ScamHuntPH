import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./resources/en.json";
import fil from "./resources/fil.json";

export const LANG_KEY = "app.lang";

const resources = {
  en: { translation: en },
  fil: { translation: fil }, // we'll map device 'tl' -> 'fil'
};

// Try to map device code 'tl' or 'fil' to our 'fil'
function deviceToAppLang(): "en" | "fil" {
  const code =
    Localization.getLocales?.()[0]?.languageCode?.toLowerCase() ?? "en";
  if (code === "tl" || code === "fil") return "fil";
  return "en";
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",                 // temporary default; we'll override below
    fallbackLng: "en",
    interpolation: { escapeValue: false }
  });

// Initialize from storage/device and switch i18n language
export async function initI18n() {
  try {
    const stored = await AsyncStorage.getItem(LANG_KEY);
    const chosen = (stored as "en" | "fil" | null) ?? deviceToAppLang();
    await i18n.changeLanguage(chosen);
  } catch {
    await i18n.changeLanguage(deviceToAppLang());
  }
}

export async function setAppLanguage(lang: "en" | "fil") {
  await AsyncStorage.setItem(LANG_KEY, lang);
  await i18n.changeLanguage(lang);
}

export default i18n;
