// src/store.ts
import { create } from "zustand";
import { ColorSchemeName, Appearance } from "react-native";

type AppState = {
  colorScheme: "light" | "dark" | "system";
  setColorScheme: (v: AppState["colorScheme"]) => void;
};

export const useAppStore = create<AppState>((set) => ({
  colorScheme: "system",
  setColorScheme: (v) => set({ colorScheme: v }),
}));

export function resolveScheme(colorScheme: AppState["colorScheme"]): "light" | "dark" {
  if (colorScheme === "system") {
    return Appearance.getColorScheme() === "dark" ? "dark" : "light";
  }
  return colorScheme;
}
