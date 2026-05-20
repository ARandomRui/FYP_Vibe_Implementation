package com.scribespeak.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.view.WindowCompat
import com.scribespeak.app.navigation.ScribeSpeakApp
import com.scribespeak.app.ui.theme.ScribeSpeakTheme

class MainActivity : ComponentActivity() {
    private var pendingSharedText by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        WindowCompat.setDecorFitsSystemWindows(window, false)
        pendingSharedText = intent.extractSharedText()

        setContent {
            ScribeSpeakTheme {
                ScribeSpeakApp(
                    appContainer = appContainer(),
                    initialSharedText = pendingSharedText,
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        pendingSharedText = intent.extractSharedText()
    }
}

private fun MainActivity.appContainer(): AppContainer {
    return (application as ScribeSpeakApplication).container
}

private fun Intent?.extractSharedText(): String? {
    if (this?.action != Intent.ACTION_SEND) return null
    if (type != "text/plain") return null
    return getStringExtra(Intent.EXTRA_TEXT)?.takeIf { it.isNotBlank() }
}
