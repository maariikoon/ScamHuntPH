package com.scamhuntph.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log

class ShareMenuActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val text = intent.getStringExtra(Intent.EXTRA_TEXT)
        Log.d("SHAREMENU_FIX", "✅ ShareMenuActivity launched with text: $text")

        val launch = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            // 👇 Send text in a way ShareMenuModule can read
            putExtra("android.intent.extra.TEXT", text)
            putExtra("android.intent.extra.PROCESS_TEXT", text)
            putExtra("share", text)
        }
        startActivity(launch)
        finish()
    }
}
