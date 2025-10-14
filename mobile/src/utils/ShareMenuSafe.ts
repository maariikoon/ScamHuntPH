import { NativeModules, Platform } from "react-native";

declare const global: {
  ExpoGo?: boolean;
} & typeof globalThis;

let ShareMenu: any = null;

if (typeof global.ExpoGo === "undefined" && NativeModules.ShareMenu) {
  ShareMenu = NativeModules.ShareMenu;
}

export const getInitialShare = async () => {
  if (!ShareMenu?.getInitialShare) {
    console.log("ℹ️ ShareMenu not available (Expo Go or not built yet)");
    return null;
  }
  try {
    const data = await ShareMenu.getInitialShare();
    return data;
  } catch (err) {
    console.warn("Error fetching shared data:", err);
    return null;
  }
};

export const addShareListener = (callback: (data: any) => void) => {
  if (!ShareMenu?.addNewShareListener) {
    console.log("ℹ️ ShareMenu listener skipped (Expo Go)");
    return;
  }
  ShareMenu.addNewShareListener(callback);
};