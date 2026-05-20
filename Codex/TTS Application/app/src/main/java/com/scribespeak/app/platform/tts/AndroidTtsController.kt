package com.scribespeak.app.platform.tts

import android.content.Context
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale

class AndroidTtsController(
    context: Context,
) : TtsController {
    private val paragraphs = mutableListOf<String>()
    private var currentIndex = 0
    private var isReady = false
    private var shouldContinue = false

    private val tts: TextToSpeech

    init {
        tts = TextToSpeech(context.applicationContext) { status ->
            isReady = status == TextToSpeech.SUCCESS
        }
        tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) = Unit

            override fun onDone(utteranceId: String?) {
                if (!shouldContinue) return
                currentIndex += 1
                speakCurrentParagraph()
            }

            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) = Unit
        })
    }

    override fun play(text: String, startParagraphIndex: Int) {
        paragraphs.clear()
        paragraphs += splitIntoParagraphs(text)
        currentIndex = startParagraphIndex.coerceIn(0, paragraphs.lastIndex.coerceAtLeast(0))
        shouldContinue = true
        speakCurrentParagraph()
    }

    override fun stop() {
        shouldContinue = false
        tts.stop()
    }

    override fun resume() {
        shouldContinue = true
        speakCurrentParagraph()
    }

    override fun jumpForwardParagraph() {
        if (paragraphs.isEmpty()) return
        currentIndex = (currentIndex + 1).coerceAtMost(paragraphs.lastIndex)
        shouldContinue = true
        speakCurrentParagraph()
    }

    private fun speakCurrentParagraph() {
        if (!isReady || paragraphs.isEmpty() || currentIndex !in paragraphs.indices) return
        tts.language = Locale.getDefault()
        tts.speak(
            paragraphs[currentIndex],
            TextToSpeech.QUEUE_FLUSH,
            Bundle(),
            "paragraph-$currentIndex",
        )
    }

    private fun splitIntoParagraphs(text: String): List<String> {
        return text.split(Regex("\\n\\s*\\n"))
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .ifEmpty { listOf(text.trim()) }
    }
}
