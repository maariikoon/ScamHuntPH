package com.scamhuntph.app

import android.content.Intent
import android.util.Log
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule

class IntentHandlerModule(private val reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {

  companion object {
    private var lastSharedText: String? = null
    private var latestContext: ReactApplicationContext? = null

    fun onNewShare(intent: Intent?) {
      val txt = intent?.getStringExtra(Intent.EXTRA_TEXT)
      Log.d("SHAREMENU_FIX", "📩 onNewShare called with: $txt")
      lastSharedText = txt
      latestContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        ?.emit("ShareText", txt)
    }
  }

  init {
    latestContext = reactContext
  }

  override fun getName() = "IntentHandlerModule"

  @ReactMethod
  fun getInitialText(promise: Promise) {
    if (lastSharedText != null) {
      promise.resolve(lastSharedText)
      Log.d("SHAREMENU_FIX", "🚀 getInitialText() returning: $lastSharedText")
      lastSharedText = null
    } else {
      promise.resolve(null)
    }
  }
}
