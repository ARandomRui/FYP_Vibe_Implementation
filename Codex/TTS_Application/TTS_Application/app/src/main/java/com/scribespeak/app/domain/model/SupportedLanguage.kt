package com.scribespeak.app.domain.model

enum class SupportedLanguage(
    val code: String,
    val displayName: String,
    val localeTag: String
) {
    ENGLISH(code = "en", displayName = "English", localeTag = "en-US"),
    MALAY(code = "ms", displayName = "Malay", localeTag = "ms-MY"),
    CHINESE(code = "zh", displayName = "Chinese", localeTag = "zh-CN"),
    SPANISH(code = "es", displayName = "Spanish", localeTag = "es-ES"),
    GERMAN(code = "de", displayName = "German", localeTag = "de-DE"),
    HINDI(code = "hi", displayName = "Hindi", localeTag = "hi-IN"),
    ITALIAN(code = "it", displayName = "Italian", localeTag = "it-IT"),
    JAPANESE(code = "ja", displayName = "Japanese", localeTag = "ja-JP"),
    KOREAN(code = "ko", displayName = "Korean", localeTag = "ko-KR"),
    ARABIC(code = "ar", displayName = "Arabic", localeTag = "ar-SA"),
    FRENCH(code = "fr", displayName = "French", localeTag = "fr-FR"),
    PORTUGUESE(code = "pt", displayName = "Portuguese", localeTag = "pt-BR"),
    BENGALI(code = "bn", displayName = "Bengali", localeTag = "bn-BD"),
    RUSSIAN(code = "ru", displayName = "Russian", localeTag = "ru-RU"),
    URDU(code = "ur", displayName = "Urdu", localeTag = "ur-PK");

    companion object {
        val default = ENGLISH

        fun fromCode(code: String?): SupportedLanguage? {
            return entries.firstOrNull { it.code == code }
        }
    }
}
