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
  },
  extra: {
    API_BASE: process.env.API_BASE || "http://localhost:4000",
    eas: {
      projectId: "2c54b610-fac6-4fc3-b16d-e6ab95c1f06f", // ✅ your EAS project ID
    },
  },
  plugins: [
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 34,   // ✅ ensures ShareMenu builds
          targetSdkVersion: 34,
          minSdkVersion: 24,
          kotlinVersion: "1.9.24", // ✅ stable Kotlin for RN 0.81
          javaVersion: "17",       // ✅ ensures Java compatibility
        },
      },
    ],
    [
      "./plugins/withShareIntent.js", // ✅ your custom share intent filter
      { mimeType: "text/plain" },
    ],
  ],
});
