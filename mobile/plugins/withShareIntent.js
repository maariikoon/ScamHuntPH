const { withAndroidManifest } = require("@expo/config-plugins");

function addShareIntent(androidManifest, mimeType) {
  const mainActivity = androidManifest.manifest.application[0].activity.find(
    (a) => a["$"]["android:name"] === ".MainActivity"
  );

  if (!mainActivity["intent-filter"]) {
    mainActivity["intent-filter"] = [];
  }

  // add SEND intent filter
  mainActivity["intent-filter"].push({
    action: [{ $: { "android:name": "android.intent.action.SEND" } }],
    category: [
      { $: { "android:name": "android.intent.category.DEFAULT" } },
    ],
    data: [{ $: { "android:mimeType": mimeType || "text/plain" } }],
  });

  return androidManifest;
}

const withShareIntent = (config, props = {}) =>
  withAndroidManifest(config, (config) => {
    config.modResults = addShareIntent(config.modResults, props.mimeType);
    return config;
  });

module.exports = withShareIntent;
