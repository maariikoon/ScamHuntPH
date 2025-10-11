// plugins/share-activity-plugin.js
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withShareMenuActivity(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];

    // ✅ Remove wrong or old ShareActivity if it exists
    app.activity = (app.activity || []).filter(
      (a) => a['$']['android:name'] !== 'com.meedan.ShareActivity'
    );

    // ✅ Add ShareMenuActivity if not already present
    const hasShareMenu = app.activity.some(
      (a) => a['$']['android:name'] === 'com.meedan.sharemenu.ShareMenuActivity'
    );

    if (!hasShareMenu) {
      app.activity.push({
        $: {
          'android:name': 'com.meedan.sharemenu.ShareMenuActivity',
          'android:exported': 'true',
          'android:launchMode': 'singleTop',
          'android:theme': '@style/Theme.AppCompat.Light.NoActionBar',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
            category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
            data: [{ $: { 'android:mimeType': 'text/plain' } }],
          },
          {
            action: [{ $: { 'android:name': 'android.intent.action.SEND_MULTIPLE' } }],
            category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
            data: [{ $: { 'android:mimeType': '*/*' } }],
          },
        ],
      });
    }

    return config;
  });
};
