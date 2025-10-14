import "dotenv/config";

export default ({ config }) => ({
  ...config,
  name: "ScamHuntPH",
  slug: "scamhuntph-app",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",

  updates: {
    url: "https://u.expo.dev/2c54b610-fac6-4fc3-b16d-e6ab95c1f06f",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  
  assetBundlePatterns: ["**/*"],

  ios: {
    supportsTablet: true,
  },

  android: {
    package: "com.scamhuntph.app",

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

    // ✅ keep your custom plugin active
    "./plugins/share-activity-plugin",
  ],
});
