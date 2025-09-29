import 'dotenv/config';

/**
 * Expo app config
 */
export default ({ config }) => ({
  ...config,
  extra: {
    API_BASE: process.env.API_BASE || "http://localhost:4000",
  },
  android: {
    package: "com.scamhuntph.app",
  },
  plugins: [
    [
      "expo-build-properties",
      {
        android: {
          // If you want to target minSdk or specific build settings, add here
        },
      },
    ],
    // 👇 custom plugin that injects the intent filter
    [
      "./plugins/withShareIntent.js",
      {
        mimeType: "text/plain", // what type of content your app can receive
      },
    ],
  ],
});
