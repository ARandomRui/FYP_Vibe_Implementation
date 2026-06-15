package com.scribespeak.app.domain.language

interface LanguageDetector {
    fun detectLanguageCode(text: String): String?
}
