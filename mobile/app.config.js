import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: "ScamHuntPH",
  slug: "scamhuntph-app",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",

  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
  },
  android: {
    package: "com.scamhuntph.app",

    // ✅ put intentFilters INSIDE the android object
    intentFilters: [
      {
        action: "android.intent.action.SEND",
        category: ["android.intent.category.DEFAULT"],
        mimeType: "text/*",
      },
      {
        action: "android.intent.action.SEND_MULTIPLE",
        category: ["android.intent.category.DEFAULT"],
        mimeType: "image/*",
      },
    ],
  },

  extra: {
    API_BASE: process.env.API_BASE || "http://localhost:4000",
    eas: {
      projectId: "2c54b610-fac6-4fc3-b16d-e6ab95c1f06f",
    },
  },

  plugins: [
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          minSdkVersion: 24,
          kotlinVersion: "2.0.21",
          javaVersion: "17",
        },
      },
    ],
  ],
  
});
