package com.scamhuntph.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.content.Context

class ShareMenuActivity : Activity() {

  companion object {
    var lastSharedText: String? = null
    private var pendingText: String? = null

    // ✅ NEW: persist & consume from SharedPreferences
    private const val PREFS = "sharemenu"
    private const val KEY = "text"

    fun persistText(ctx: Context?, value: String?) {
      val prefs = ctx?.getSharedPreferences(PREFS, Context.MODE_PRIVATE) ?: return
      prefs.edit().apply {
        if (value != null) putString(KEY, value) else remove(KEY)
      }.apply()
    }

    fun takePersistedText(ctx: Context?): String? {
      val prefs = ctx?.getSharedPreferences(PREFS, Context.MODE_PRIVATE) ?: return null
      val v = prefs.getString(KEY, null)
      if (v != null) prefs.edit().remove(KEY).apply()
      return v
    }

    fun consumePendingText(): String? {
      val txt = pendingText ?: lastSharedText
      pendingText = null
      lastSharedText = null
      return txt
    }

    fun maybeSendPendingEvent(context: ReactContext?) {
      pendingText?.let {
        Log.d("SHAREMENU_FIX", "📤 Flushing pending ShareText: $it")
        context?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          ?.emit("ShareText", it)
        pendingText = null
        // We intentionally keep lastSharedText untouched here; consumePendingText() clears both.
      }
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val text = intent.getStringExtra(Intent.EXTRA_TEXT)
    Log.d("SHAREMENU_FIX", "✅ ShareMenuActivity launched with text: $text")

    lastSharedText = text
    pendingText = text
    persistText(applicationContext, text)

    val app = application as? ReactApplication
    val reactInstanceManager = app?.reactNativeHost?.reactInstanceManager
    val reactContext = reactInstanceManager?.currentReactContext

    if (reactContext != null && reactContext.hasActiveCatalystInstance()) {
      Log.d("SHAREMENU_FIX", "📡 React bridge already active — emit immediately")
      maybeSendPendingEvent(reactContext)
    } else {
      Log.d("SHAREMENU_FIX", "🕓 Waiting for existing ReactContext to initialize")
      reactInstanceManager?.addReactInstanceEventListener(
        object : com.facebook.react.ReactInstanceEventListener {
          override fun onReactContextInitialized(context: com.facebook.react.bridge.ReactContext) {
            Log.d("SHAREMENU_FIX", "🔥 React bridge initialized, flushing pending share")
            maybeSendPendingEvent(context)
            reactInstanceManager.removeReactInstanceEventListener(this)
        }
      })

      // 🧱 Only rebuild the bridge if it's truly null (cold start)
      if (reactContext == null) {
        Log.d("SHAREMENU_FIX", "🚀 No existing ReactContext found — creating React bridge in background")
        reactInstanceManager?.createReactContextInBackground()
      } else {
        Log.d("SHAREMENU_FIX", "🕓 ReactContext exists but not yet active — will wait for listener callback")
      }
    }


    // Bring main app to front
    val launch = Intent(this, MainActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
      putExtra(Intent.EXTRA_TEXT, text)
    }
    startActivity(launch)

    // Delay finish until bridge is created or after 3s max
    android.os.Handler(mainLooper).postDelayed({
      Log.d("SHAREMENU_FIX", "⌛ Finishing ShareMenuActivity safely after waiting for React bridge")
      finish()
    }, 3000)
  }
}