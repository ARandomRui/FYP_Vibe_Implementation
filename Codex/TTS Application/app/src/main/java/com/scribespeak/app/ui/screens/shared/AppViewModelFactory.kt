package com.scribespeak.app.ui.screens.shared

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.scribespeak.app.AppContainer
import com.scribespeak.app.domain.usecase.ObserveRecentItemsUseCase
import com.scribespeak.app.ui.screens.home.HomeViewModel
import com.scribespeak.app.ui.screens.importer.ImportViewModel

class AppViewModelFactory(
    private val appContainer: AppContainer,
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return when {
            modelClass.isAssignableFrom(HomeViewModel::class.java) -> {
                HomeViewModel(ObserveRecentItemsUseCase(appContainer.contentRepository)) as T
            }
            modelClass.isAssignableFrom(ImportViewModel::class.java) -> {
                ImportViewModel() as T
            }
            else -> error("Unknown ViewModel class: ${modelClass.name}")
        }
    }
}
