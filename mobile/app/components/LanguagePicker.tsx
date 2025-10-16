// components/LanguagePicker.tsx
import { useTranslation } from "react-i18next";
import { setAppLanguage } from "../../i18n";
import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";

export default function LanguagePicker() {
  const { t, i18n } = useTranslation();
  const current =
    i18n.language?.startsWith("fil") || i18n.language?.startsWith("tl") ? "fil" : "en";

  const onPick = async (code: "en" | "fil") => {
    if (code === current) return;
    try {
      await setAppLanguage(code);
    } catch (e) {
      console.warn("Failed to change language:", e);
    }
  };

  const options = [
    { code: "en" as const, label: t("common.english", "English") },
    { code: "fil" as const, label: t("common.filipino", "Filipino") },
  ];

  return (
    <View style={S.card}>
      <Text style={S.title}>{t("common.language", "Language")}</Text>

      <View style={S.row}>
        {options.map((opt) => {
          const active = current === opt.code;
          return (
            <Pressable
              key={opt.code}
              onPress={() => onPick(opt.code)}
              android_ripple={{ color: C.blue100, borderless: false }}
              style={({ pressed }) => [
                S.pill,
                active && S.pillActive,
                pressed && !active && S.pillPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("common.switchTo", "Switch to {{lang}}", {
                lang: opt.label,
              })}
              accessibilityState={{ selected: active }}
            >
              <View style={S.pillInner}>
                <View style={[S.dot, active && S.dotActive]} />
                <Text style={[S.pillText, active && S.pillTextActive]} numberOfLines={1}>
                  {opt.label}
                </Text>
                {active && <Text style={S.check}>✓</Text>}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={S.hint}>
        {t(
          "common.languageHint",
          "Your app language will update immediately."
        )}
      </Text>
    </View>
  );
}

/* ---------- Theme (match app blues) ---------- */
const C = {
  text: "#0f172a",
  sub: "#64748b",
  line: "#e6eaf0",
  blue50: "#eff6ff",
  blue100: "#dbeafe",
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  cardBg: "#ffffff",
};

const S = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.cardBg,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.06 : 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: C.text,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },

  /* Language pill */
  pill: {
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "#f8fafc",
  },
  pillPressed: {
    opacity: 0.9,
  },
  pillActive: {
    backgroundColor: C.blue50,
    borderColor: C.blue100,
  },
  pillInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: C.blue100,
    backgroundColor: "#fff",
  },
  dotActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  pillText: {
    flex: 1,
    color: C.sub,
    fontWeight: "700",
  },
  pillTextActive: {
    color: C.primaryDark,
  },
  check: {
    fontSize: 14,
    fontWeight: "800",
    color: C.primaryDark,
    marginLeft: 4,
  },

  hint: {
    marginTop: 10,
    color: C.sub,
    fontSize: 12,
  },
});
