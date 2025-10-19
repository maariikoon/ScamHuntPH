package com.scamhuntph.app

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactMethod
import android.util.Log
import android.content.Context

class IntentModule(private val reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "IntentModule"

  @ReactMethod
  fun getInitialText(promise: Promise) {
    try {
      // Flush any pending event first
      ShareMenuActivity.maybeSendPendingEvent(reactContext)

      val persisted = ShareMenuActivity.takePersistedText(reactContext)

      val txt = persisted
        ?: ShareMenuActivity.consumePendingText()

      if (txt != null) {
        promise.resolve(txt)
        Log.d("SHAREMENU_FIX", "🚀 getInitialText() returning: $txt")
        // clear after use
        ShareMenuActivity.lastSharedText = null
      } else {
        promise.resolve(null)
      }
    } catch (e: Exception) {
      promise.reject("INTENT_ERROR", e)
    }
  }
}
