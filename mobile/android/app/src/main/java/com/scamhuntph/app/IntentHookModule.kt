package com.scamhuntph.app

import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.ReactApplication

class IntentHookModule(private val reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "IntentHookModule"

  fun handleIntent(intent: Intent?) {
    // ✅ Prefer pending/queued text first to avoid duplicates
    val txt = ShareMenuActivity.takePersistedText(reactContext)
      ?: ShareMenuActivity.consumePendingText()
      ?: intent?.getStringExtra(Intent.EXTRA_TEXT)
      ?: ShareMenuActivity.lastSharedText
      ?: return

    Log.d("SHAREMENU_FIX", "📦 IntentHookModule.handleIntent() called with: $txt")
    ShareMenuActivity.persistText(reactContext, txt)
    ShareMenuActivity.lastSharedText = null

    val app = reactContext.applicationContext as? ReactApplication
    val liveContext = app?.reactNativeHost?.reactInstanceManager?.currentReactContext

    Handler(Looper.getMainLooper()).postDelayed({
      if (liveContext != null && liveContext.hasActiveCatalystInstance()) {
        Log.d("SHAREMENU_FIX", "🚀 Emitting ShareText to JS: $txt")
        liveContext
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("ShareText", txt)
      } else {
        Log.d("SHAREMENU_FIX", "⚠️ No active ReactContext (JS bridge not ready)")
      }
    }, 500)
  }
}
