// src/theme.ts
import { Appearance, ColorSchemeName } from "react-native";

export type Theme = {
  colorScheme: "light" | "dark";
  colors: {
    primary: string;      // brand blue
    text: string;         // primary text
    textMuted: string;    // secondary text
    bg: string;           // background
    card: string;         // card background
    border: string;       // subtle border
    danger: string;
    success: string;
    warning: string;
    tabInactive: string;
  };
  spacing: (n: number) => number; // 8-pt scale
  typography: {
    h1: { fontSize: number; lineHeight: number; fontWeight: "700" | "800"; };
    h2: { fontSize: number; lineHeight: number; fontWeight: "700" | "800"; };
    body: { fontSize: number; lineHeight: number; };
    small: { fontSize: number; lineHeight: number; color?: string };
  };
  shadow: {
    card: any;
  };
  touch: {
    minSize: { minHeight: number; minWidth: number; justifyContent: "center"; alignItems: "center" };
  };
};

export function makeTheme(scheme?: ColorSchemeName): Theme {
  const mode = (scheme ?? Appearance.getColorScheme()) === "dark" ? "dark" : "light";
  const isDark = mode === "dark";

  const colors = {
    primary: "#007AFF",
    text: isDark ? "#F2F2F7" : "#111827",
    textMuted: isDark ? "#A1A1AA" : "#6B7280",
    bg: isDark ? "#0B0B0F" : "#FFFFFF",
    card: isDark ? "#15151A" : "#FAFAFA",
    border: isDark ? "#2A2A32" : "#E5E7EB",
    danger: "#FF3B30",
    success: "#10B981",
    warning: "#F59E0B",
    tabInactive: isDark ? "#8E8E93" : "#8e8e93",
  };

  return {
    colorScheme: mode,
    colors,
    spacing: (n: number) => n * 8, // 8-pt scale
    typography: {
      h1: { fontSize: 24, lineHeight: 28, fontWeight: "800" },
      h2: { fontSize: 20, lineHeight: 24, fontWeight: "700" },
      body: { fontSize: 16, lineHeight: 22 },
      small: { fontSize: 12, lineHeight: 16, color: colors.textMuted },
    },
    shadow: {
      card: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      },
    },
    touch: {
      minSize: { minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "center" },
    },
  };
}
