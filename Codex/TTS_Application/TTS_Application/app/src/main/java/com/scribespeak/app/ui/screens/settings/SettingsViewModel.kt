package com.scribespeak.app.ui.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.scribespeak.app.domain.model.SpeechSettings
import com.scribespeak.app.domain.model.SupportedLanguage
import com.scribespeak.app.domain.repository.SettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository
) : ViewModel() {
    val uiState = settingsRepository.observeSpeechSettings()
        .map { settings ->
            SettingsUiState(
                speechSettings = settings,
                supportedLanguages = SupportedLanguage.entries
            )
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = SettingsUiState()
        )

    fun setAutoDetectLanguage(enabled: Boolean) {
        viewModelScope.launch {
            settingsRepository.setAutoDetectLanguage(enabled)
        }
    }

    fun setPreferredLanguage(languageCode: String) {
        viewModelScope.launch {
            settingsRepository.setPreferredLanguageCode(languageCode)
        }
    }
}

data class SettingsUiState(
    val speechSettings: SpeechSettings = SpeechSettings(),
    val supportedLanguages: List<SupportedLanguage> = emptyList()
)
