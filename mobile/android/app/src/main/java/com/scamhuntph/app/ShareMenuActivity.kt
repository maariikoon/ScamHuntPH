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
      }
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val text = intent.getStringExtra(Intent.EXTRA_TEXT)
    Log.d("SHAREMENU_FIX", "✅ ShareMenuActivity launched with text: $text")

    // ✅ Store the text for later retrieval
    lastSharedText = text
    pendingText = text
    persistText(applicationContext, text)

    // ✅ Just launch MainActivity - let it handle everything
    val launch = Intent(this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      putExtra(Intent.EXTRA_TEXT, text)
    }
    startActivity(launch)
    
    // ✅ Close this activity immediately
    finish()
  }
}