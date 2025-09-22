// src/i18n.ts
export type Lang = "en" | "fil";
export const strings: Record<Lang, Record<string, string>> = {
  en: {
    home: "Home",
    learn: "Learn",
    report: "Report",
    alerts: "Alerts",
    profile: "Profile",
    yourReports: "Your Reports",
    noReports: "No reports yet.",
    retry: "Retry",
    submitReport: "Submit Report",
    success: "Success",
    viewInMyReports: "View in My Reports",
  },
  fil: {
    home: "Bahay",
    learn: "Aral",
    report: "I-ulat",
    alerts: "Alerto",
    profile: "Profile",
    yourReports: "Mga Ulat Mo",
    noReports: "Wala pang ulat.",
    retry: "Subukan Muli",
    submitReport: "Isumite ang Ulat",
    success: "Tagumpay",
    viewInMyReports: "Tingnan sa Mga Ulat Ko",
  },
};

let current: Lang = "en";
export function setLang(l: Lang) { current = l; }
export function t(key: string): string { return strings[current][key] ?? key; }
