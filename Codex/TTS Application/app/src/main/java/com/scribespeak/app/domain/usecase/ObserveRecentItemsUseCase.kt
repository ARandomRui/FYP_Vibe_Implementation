package com.scribespeak.app.domain.usecase

import com.scribespeak.app.domain.repository.ContentRepository

class ObserveRecentItemsUseCase(
    private val contentRepository: ContentRepository,
) {
    operator fun invoke() = contentRepository.observeRecentItems()
}
