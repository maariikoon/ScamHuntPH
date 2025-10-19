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
    super.onCreate(null)

    // ❌ removed: this could fire before the JS bridge exists
    // ShareMenuActivity.maybeSendPendingEvent(reactNativeHost.reactInstanceManager.currentReactContext)
  }

  @Suppress("DEPRECATION")
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    android.util.Log.d("SHAREMENU_FIX", "🛰️ onNewIntent() received EXTRA_TEXT=" + intent.getStringExtra(Intent.EXTRA_TEXT))

    val instanceManager = reactNativeHost.reactInstanceManager
    val context = instanceManager.currentReactContext

    var hook = context?.getNativeModule(IntentHookModule::class.java)

    if (hook == null) {
      android.util.Log.d("SHAREMENU_FIX", "⚠️ IntentHookModule not in current context, trying from instanceManager")
      val packages = instanceManager.packages
      for (pkg in packages) {
        if (pkg is IntentPackage) {
          android.util.Log.d("SHAREMENU_FIX", "✅ Found IntentPackage, creating new IntentHookModule manually")
          hook = IntentHookModule(instanceManager.currentReactContext as com.facebook.react.bridge.ReactApplicationContext)
          break
        }
      }
    }

    if (hook == null) {
      android.util.Log.d("SHAREMENU_FIX", "❌ Still no IntentHookModule instance; skipping handleIntent()")
    } else {
      android.util.Log.d("SHAREMENU_FIX", "✅ Invoking IntentHookModule.handleIntent() …")
      hook.handleIntent(intent)
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

  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              super.invokeDefaultOnBackPressed()
          }
          return
      }
      super.invokeDefaultOnBackPressed()
  }
}