package com.scamhuntph.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity

class ShareActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Handle the shared text
        val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)

        if (sharedText != null) {
            // Pass shared data to your main React activity
            val newIntent = Intent(this, MainActivity::class.java)
            newIntent.putExtra("sharedText", sharedText)
            newIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            startActivity(newIntent)
        }

        finish()
    }
}
