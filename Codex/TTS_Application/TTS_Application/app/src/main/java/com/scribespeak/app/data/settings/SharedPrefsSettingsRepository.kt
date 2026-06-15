package com.scribespeak.app.data.settings

import android.content.Context
import com.scribespeak.app.domain.model.SpeechSettings
import com.scribespeak.app.domain.model.SupportedLanguage
import com.scribespeak.app.domain.repository.SettingsRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

@Singleton
class SharedPrefsSettingsRepository @Inject constructor(
    @ApplicationContext context: Context
) : SettingsRepository {
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val settingsState = MutableStateFlow(readSettings())

    override fun observeSpeechSettings(): Flow<SpeechSettings> = settingsState.asStateFlow()

    override suspend fun setAutoDetectLanguage(enabled: Boolean) {
        prefs.edit()
            .putBoolean(KEY_AUTO_DETECT_LANGUAGE, enabled)
            .apply()
        settingsState.value = readSettings()
    }

    override suspend fun setPreferredLanguageCode(languageCode: String) {
        prefs.edit()
            .putString(KEY_PREFERRED_LANGUAGE_CODE, languageCode)
            .apply()
        settingsState.value = readSettings()
    }

    private fun readSettings(): SpeechSettings {
        return SpeechSettings(
            autoDetectLanguage = prefs.getBoolean(KEY_AUTO_DETECT_LANGUAGE, true),
            preferredLanguageCode = prefs.getString(
                KEY_PREFERRED_LANGUAGE_CODE,
                SupportedLanguage.default.code
            ) ?: SupportedLanguage.default.code
        )
    }

    private companion object {
        const val PREFS_NAME = "scribespeak_settings"
        const val KEY_AUTO_DETECT_LANGUAGE = "auto_detect_language"
        const val KEY_PREFERRED_LANGUAGE_CODE = "preferred_language_code"
    }
}
