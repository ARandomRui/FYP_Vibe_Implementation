package com.scribespeak.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import dagger.hilt.android.AndroidEntryPoint
import com.scribespeak.app.domain.util.findFirstUrl
import com.scribespeak.app.ui.ScribeSpeakApp
import com.scribespeak.app.ui.theme.ScribeSpeakTheme

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private var sharedUrl by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        sharedUrl = extractSharedUrl(intent)
        enableEdgeToEdge()
        setContent {
            ScribeSpeakTheme {
                ScribeSpeakApp(
                    sharedUrl = sharedUrl,
                    onSharedUrlConsumed = {
                        sharedUrl = null
                    }
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        sharedUrl = extractSharedUrl(intent)
    }

    private fun extractSharedUrl(intent: Intent?): String? {
        if (intent == null) return null

        return when (intent.action) {
            Intent.ACTION_SEND -> {
                intent.getStringExtra(Intent.EXTRA_TEXT)?.findFirstUrl()
            }

            Intent.ACTION_VIEW -> intent.dataString?.findFirstUrl()
            else -> null
        }
    }
}
