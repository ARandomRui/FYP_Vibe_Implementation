package com.scribespeak.app.ui.screens.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.scribespeak.app.AppContainer
import com.scribespeak.app.ui.components.SectionCard

@Composable
fun SettingsRoute(
    appContainer: AppContainer,
) {
    val voices = remember { mutableStateListOf<String>() }

    LaunchedEffect(Unit) {
        voices.clear()
        voices += appContainer.voiceRepository.getAvailableVoices()
            .take(5)
            .map { voice -> "${voice.localeTag} • ${voice.name}" }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        SectionCard(
            title = "Voice and app settings",
            subtitle = "The production app will expose language preferences, voice selection, OCR behavior, and cache controls here.",
        )
        SectionCard(
            title = "Detected voices",
            subtitle = if (voices.isEmpty()) {
                "No voices detected yet, or the TTS engine is still initializing."
            } else {
                voices.joinToString(separator = "\n")
            },
        )
        Text("Version 1 target includes 10 common languages with offline-device voice selection where available.")
    }
}
