package com.scribespeak.app.data.repository

import android.content.Context
import android.speech.tts.TextToSpeech
import com.scribespeak.app.domain.model.VoiceOption
import com.scribespeak.app.domain.repository.VoiceRepository
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SystemVoiceRepository(
    private val context: Context,
) : VoiceRepository {
    override suspend fun getAvailableVoices(): List<VoiceOption> {
        return withContext(Dispatchers.IO) {
            val latch = CountDownLatch(1)
            val voices = mutableListOf<VoiceOption>()
            var tts: TextToSpeech? = null

            tts = TextToSpeech(context) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    tts?.voices
                        ?.sortedBy { it.locale?.displayName ?: "" }
                        ?.forEach { voice ->
                            val localeTag = voice.locale?.toLanguageTag().orEmpty()
                            voices += VoiceOption(
                                id = voice.name,
                                name = buildVoiceLabel(voice.locale ?: Locale.getDefault(), voice.name),
                                localeTag = localeTag,
                                isOfflinePreferred = !voice.isNetworkConnectionRequired,
                                isInstalled = true,
                            )
                        }
                }
                latch.countDown()
            }

            latch.await(2, TimeUnit.SECONDS)
            tts?.stop()
            tts?.shutdown()
            voices
        }
    }

    private fun buildVoiceLabel(locale: Locale, name: String): String {
        return "${locale.displayLanguage} (${locale.displayCountry.ifBlank { locale.toLanguageTag() }}) - $name"
    }
}
