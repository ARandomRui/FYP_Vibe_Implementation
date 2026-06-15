package com.scribespeak.app.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.scribespeak.app.domain.repository.ContentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn

@HiltViewModel
class HomeViewModel @Inject constructor(
    contentRepository: ContentRepository
) : ViewModel() {
    val uiState = combine(
        contentRepository.observeLibraryCount(),
        contentRepository.observeRecentItems(limit = 5)
    ) { libraryCount, recentItems ->
        HomeUiState(
            libraryCount = libraryCount,
            recentItems = recentItems
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = HomeUiState()
    )
}
