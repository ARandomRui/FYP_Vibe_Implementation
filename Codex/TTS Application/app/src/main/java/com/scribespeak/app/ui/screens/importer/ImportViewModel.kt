package com.scribespeak.app.ui.screens.importer

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class ImportUiState(
    val url: String = "",
    val statusMessage: String = "URL extraction, PDF picking, OCR fallback, and persistent caching are the next feature steps.",
)

class ImportViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(ImportUiState())
    val uiState: StateFlow<ImportUiState> = _uiState.asStateFlow()

    fun onUrlChanged(value: String) {
        _uiState.update { it.copy(url = value) }
    }

    fun preloadSharedText(sharedText: String?) {
        if (!sharedText.isNullOrBlank()) {
            _uiState.update { it.copy(url = sharedText) }
        }
    }
}
