package com.scribespeak.app.domain.model

data class SpeechSettings(
    val autoDetectLanguage: Boolean = true,
    val preferredLanguageCode: String = SupportedLanguage.default.code
)
