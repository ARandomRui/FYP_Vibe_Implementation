package com.scribespeak.app.domain.repository

import com.scribespeak.app.domain.model.SpeechSettings
import kotlinx.coroutines.flow.Flow

interface SettingsRepository {
    fun observeSpeechSettings(): Flow<SpeechSettings>

    suspend fun setAutoDetectLanguage(enabled: Boolean)

    suspend fun setPreferredLanguageCode(languageCode: String)
}
