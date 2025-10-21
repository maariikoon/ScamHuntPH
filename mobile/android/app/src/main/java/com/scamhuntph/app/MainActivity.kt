package com.scamhuntph.app
import expo.modules.splashscreen.SplashScreenManager

import android.os.Build
import android.os.Bundle
import android.content.Intent

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    SplashScreenManager.registerOnActivity(this)
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
    super.onCreate(savedInstanceState)

    // ❌ removed: this could fire before the JS bridge exists
    // ShareMenuActivity.maybeSendPendingEvent(reactNativeHost.reactInstanceManager.currentReactContext)
  }

  @Suppress("DEPRECATION")
  override fun onNewIntent(intent: Intent) {
      super.onNewIntent(intent)
      setIntent(intent) // ✅ Update the intent
      
      val text = intent.getStringExtra(Intent.EXTRA_TEXT)
      android.util.Log.d("SHAREMENU_FIX", "🛰️ onNewIntent() received EXTRA_TEXT=$text")

      // ✅ Always persist the text
      if (text != null) {
          ShareMenuActivity.persistText(applicationContext, text)
          ShareMenuActivity.lastSharedText = text
          android.util.Log.d("SHAREMENU_FIX", "💾 Persisted share text: $text")
      }

      val instanceManager = reactNativeHost.reactInstanceManager
      val context = instanceManager.currentReactContext

      // ✅ If React isn't ready, just persist and let JS pick it up
      if (context == null || !context.hasActiveCatalystInstance()) {
          android.util.Log.d("SHAREMENU_FIX", "⚠️ ReactContext not ready, will be picked up by JS later")
          return
      }

      // ✅ Try to emit the event if React is ready
      try {
          val appContext = context as? com.facebook.react.bridge.ReactApplicationContext
          if (appContext != null && text != null) {
              android.util.Log.d("SHAREMENU_FIX", "📤 Emitting ShareText event directly")
              context.getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                  .emit("ShareText", text)
          }
      } catch (e: Exception) {
          android.util.Log.e("SHAREMENU_FIX", "❌ Failed to emit event: ${e.message}")
      }
  }

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

}