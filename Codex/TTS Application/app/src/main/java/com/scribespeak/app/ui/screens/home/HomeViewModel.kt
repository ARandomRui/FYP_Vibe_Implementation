package com.scribespeak.app.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.scribespeak.app.domain.model.ContentItem
import com.scribespeak.app.domain.usecase.ObserveRecentItemsUseCase
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

data class HomeUiState(
    val recentItems: List<ContentItem> = emptyList(),
)

class HomeViewModel(
    observeRecentItems: ObserveRecentItemsUseCase,
) : ViewModel() {
    val uiState: StateFlow<HomeUiState> = observeRecentItems()
        .map { HomeUiState(recentItems = it.take(5)) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = HomeUiState(),
        )
}
