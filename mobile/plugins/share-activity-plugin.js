// plugins/share-activity-plugin.js
const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Ensures our custom ShareMenuActivity is declared correctly for ScamHuntPH.
 * Removes any old Meedan or duplicate entries that Expo may inject.
 */
module.exports = function withShareMenuActivity(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];

    // 🔹 Remove any old ShareActivity or Meedan duplicates
    app.activity = (app.activity || []).filter(
      (a) =>
        a["$"]["android:name"] !== "com.meedan.sharemenu.ShareMenuActivity" &&
        a["$"]["android:name"] !== "com.meedan.ShareMenuActivity" &&
        a["$"]["android:name"] !== "com.scamhuntph.app.ShareActivity"
    );

    // 🔹 Add our correct ShareMenuActivity
    const hasShareMenu = app.activity.some(
      (a) => a["$"]["android:name"] === "com.scamhuntph.app.ShareMenuActivity"
    );

    if (!hasShareMenu) {
      app.activity.push({
        $: {
          "android:name": "com.scamhuntph.app.ShareMenuActivity",
          "android:exported": "true",
          "android:launchMode": "singleTop",
          "android:theme": "@style/Theme.AppCompat.Light.NoActionBar",
        },
        "intent-filter": [
          {
            action: [{ $: { "android:name": "android.intent.action.SEND" } }],
            category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
            data: [{ $: { "android:mimeType": "text/plain" } }],
          },
          {
            action: [{ $: { "android:name": "android.intent.action.SEND_MULTIPLE" } }],
            category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
            data: [{ $: { "android:mimeType": "*/*" } }],
          },
        ],
      });
    }

    return config;
  });
};
