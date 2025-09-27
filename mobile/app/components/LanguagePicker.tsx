// components/LanguagePicker.tsx
import { useTranslation } from "react-i18next";
import { setAppLanguage } from "../../i18n";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function LanguagePicker() {
  const { t, i18n } = useTranslation();
  const current =
    i18n.language?.startsWith("fil") || i18n.language?.startsWith("tl") ? "fil" : "en";

  const onPick = async (code: "en" | "fil") => {
    if (code === current) return;        // no-op if already selected
    try {
      await setAppLanguage(code);        // persists + triggers rerender via i18next
    } catch (e) {
      // optional: show a toast/alert here
      console.warn("Failed to change language:", e);
    }
  };

  return (
    <View style={S.card}>
      <Text style={S.label}>{t("common.language")}</Text>
      <View style={S.row}>
        {[
          { code: "en" as const, label: t("common.english") },
          { code: "fil" as const, label: t("common.filipino") },
        ].map((opt) => {
          const active = current === opt.code;
          return (
            <TouchableOpacity
              key={opt.code}
              onPress={() => onPick(opt.code)}
              style={[S.btn, active && S.btnActive]}
              accessibilityRole="button"
              accessibilityLabel={t("common.switchTo", {
                defaultValue: "Switch to {{lang}}",
                lang: opt.label,
              })}
              accessibilityState={{ selected: active }}
            >
              <Text style={[S.btnText, active && S.btnTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  label: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  row: { flexDirection: "row", gap: 8 },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  btnActive: { backgroundColor: "#e0e7ff", borderColor: "#c7d2fe" },
  btnText: { color: "#334155", fontWeight: "600" },
  btnTextActive: { color: "#1e40af" },
});
