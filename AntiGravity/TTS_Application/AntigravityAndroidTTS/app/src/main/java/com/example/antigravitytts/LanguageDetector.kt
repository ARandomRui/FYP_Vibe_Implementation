package com.example.antigravitytts

import java.util.Locale

object LanguageDetector {
    // Unicode Blocks
    private val ARABIC_RANGE = "\\p{InArabic}"
    private val CJK_RANGE = "\\p{InCJK_Unified_Ideographs}"
    private val CYRILLIC_RANGE = "\\p{InCyrillic}"
    private val HANGUL_RANGE = "\\p{InHangul_Syllables}"
    private val HIRAGANA_KATAKANA_RANGE = "\\p{InHiragana}|\\p{InKatakana}"
    private val DEVANAGARI_RANGE = "\\p{InDevanagari}"

    fun detectLanguage(text: String): Locale? {
        val sample = if (text.length > 300) text.substring(0, 300) else text

        // 1. Check for Distinct Scripts First
        val arabicCount = countMatches(sample, ARABIC_RANGE)
        val cjkCount = countMatches(sample, CJK_RANGE)
        val cyrillicCount = countMatches(sample, CYRILLIC_RANGE)
        val hangulCount = countMatches(sample, HANGUL_RANGE)
        val japCount = countMatches(sample, HIRAGANA_KATAKANA_RANGE)
        val hindiCount = countMatches(sample, DEVANAGARI_RANGE)

        val scriptMap = mapOf(
            "ar" to arabicCount,
            "zh" to cjkCount,
            "ru" to cyrillicCount,
            "ko" to hangulCount,
            "ja" to japCount,
            "hi" to hindiCount
        )

        val bestScript = scriptMap.maxByOrNull { it.value }
        
        // If we found a significant number of script characters (> 5), rely on script
        if (bestScript != null && bestScript.value > 5) {
             return when (bestScript.key) {
                "ar" -> Locale("ar")
                "zh" -> Locale.CHINESE // Simplified
                "ru" -> Locale("ru")
                "ko" -> Locale.KOREAN
                "ja" -> Locale.JAPANESE
                "hi" -> Locale("hi")
                else -> null
            }
        }

        // 2. Fallback: Latin-based Language Detection (Stop-words)
        // Only run this if we didn't find a strong non-Latin script match
        return detectLatinLanguage(sample)
    }

    private fun detectLatinLanguage(text: String): Locale? {
        val words = text.lowercase().split("\\s+".toRegex())
            .map { it.filter { char -> char.isLetter() } } // Cleanup punctuation
            .filter { it.length > 1 } // Ignore single letters

        val scores = mutableMapOf<String, Int>()

        // Common Stop Words for Major Languages
        val stopWords = mapOf(
            "en" to setOf("the", "and", "is", "of", "to", "in", "it", "that", "was", "for", "on", "are", "with", "as", "be"),
            "de" to setOf("der", "die", "und", "in", "zu", "den", "das", "von", "nicht", "mit", "ist", "im", "auf", "für"),
            "fr" to setOf("le", "la", "et", "les", "de", "en", "un", "une", "est", "pas", "dans", "pour", "qui", "sur", "que"),
            "es" to setOf("el", "la", "de", "que", "y", "en", "un", "una", "ser", "es", "por", "con", "para", "su", "al"),
            "it" to setOf("il", "la", "e", "di", "che", "in", "un", "ad", "non", "per", "una", "è", "le", "con", "sono"),
            "pt" to setOf("o", "a", "e", "de", "do", "da", "em", "um", "uma", "com", "não", "para", "os", "as", "por"),
            "id" to setOf("yang", "dan", "di", "ke", "dari", "ini", "itu", "untuk", "pada", "adalah", "dengan", "saya", "tidak", "akan"),
            "ms" to setOf("yang", "dan", "di", "ke", "dari", "ini", "itu", "untuk", "pada", "adalah", "dengan", "saya", "tidak", "akan")
        )

        for (word in words) {
            for ((lang, list) in stopWords) {
                if (list.contains(word)) {
                    scores[lang] = scores.getOrDefault(lang, 0) + 1
                }
            }
        }

        val bestMatch = scores.maxByOrNull { it.value }
        
        // Threshold: Need at least 2 stop word hits to be confident
        if (bestMatch != null && bestMatch.value >= 2) {
             return when (bestMatch.key) {
                "en" -> Locale.ENGLISH
                "de" -> Locale.GERMAN
                "fr" -> Locale.FRENCH
                "es" -> Locale("es")
                "it" -> Locale.ITALIAN
                "pt" -> Locale("pt")
                "id" -> Locale("id")
                "ms" -> Locale("ms")
                else -> null
            }
        }
        
        // Default to English if ambiguous but definitely Latin script? 
        // Or return null to keep current voice? Let's return null to avoid aggressive switching.
        return null 
    }

    private fun countMatches(text: String, regexPattern: String): Int {
        val regex = regexPattern.toRegex()
        return regex.findAll(text).count()
    }
}
