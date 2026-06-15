package com.scribespeak.app.data.language

import com.scribespeak.app.domain.language.LanguageDetector
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class HeuristicLanguageDetector @Inject constructor() : LanguageDetector {
    override fun detectLanguageCode(text: String): String? {
        val sample = text.take(4_000)
        if (sample.isBlank()) return null

        return when {
            containsRange(sample, 0x0980, 0x09FF) -> "bn"
            containsRange(sample, 0x0900, 0x097F) -> "hi"
            containsRange(sample, 0x4E00, 0x9FFF) -> "zh"
            containsRange(sample, 0x3040, 0x30FF) -> "ja"
            containsRange(sample, 0xAC00, 0xD7AF) -> "ko"
            containsRange(sample, 0x0400, 0x04FF) -> "ru"
            containsRange(sample, 0x0600, 0x06FF) -> {
                if (sample.any { it in URDU_HINTS }) "ur" else "ar"
            }

            else -> detectLatinLanguage(sample)
        }
    }

    private fun detectLatinLanguage(sample: String): String {
        val lowered = sample.lowercase()
        val scores = linkedMapOf(
            "ms" to score(lowered, MALAY_HINTS),
            "pt" to score(lowered, PORTUGUESE_HINTS),
            "fr" to score(lowered, FRENCH_HINTS),
            "es" to score(lowered, SPANISH_HINTS),
            "de" to score(lowered, GERMAN_HINTS),
            "it" to score(lowered, ITALIAN_HINTS),
            "en" to score(lowered, ENGLISH_HINTS)
        )

        return scores.maxByOrNull { it.value }?.takeIf { it.value > 0 }?.key ?: "en"
    }

    private fun score(text: String, hints: List<String>): Int {
        return hints.sumOf { hint ->
            Regex("\\b${Regex.escape(hint)}\\b").findAll(text).count()
        }
    }

    private fun containsRange(text: String, start: Int, end: Int): Boolean {
        return text.any { it.code in start..end }
    }

    private companion object {
        // Use escapes so these hints stay stable even if a terminal mangles Unicode output.
        val URDU_HINTS = setOf('\u06D2', '\u06BA', '\u06BE', '\u0679', '\u0688', '\u0691', '\u0686')
        val ENGLISH_HINTS = listOf("the", "and", "with", "from", "that", "this", "have")
        val MALAY_HINTS = listOf("yang", "dan", "untuk", "dengan", "tidak", "dalam", "pada")
        val SPANISH_HINTS = listOf("el", "la", "de", "que", "los", "para", "una", "con")
        val FRENCH_HINTS = listOf("le", "la", "les", "des", "une", "avec", "pour", "est")
        val GERMAN_HINTS = listOf("der", "die", "das", "und", "mit", "nicht", "eine")
        val ITALIAN_HINTS = listOf("che", "con", "per", "una", "della", "sono", "degli")
        val PORTUGUESE_HINTS = listOf("que", "com", "para", "uma", "nao", "como", "dos", "das")
    }
}
