package com.scribespeak.app.data.repository

import com.scribespeak.app.domain.model.ContentItem
import com.scribespeak.app.domain.model.SourceType
import com.scribespeak.app.domain.repository.ContentRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class InMemoryContentRepository : ContentRepository {
    private val recentItems = MutableStateFlow(
        listOf(
            ContentItem(
                id = 1L,
                title = "Welcome to ScribeSpeak",
                originalSource = "Local demo content",
                sourceKey = "demo-welcome",
                sourceType = SourceType.WEB,
                extractedText = "This placeholder item proves the app shell is wired. Web extraction, PDF parsing, OCR, and persistent history come next.",
                languageCode = "en",
                lastReadParagraphIndex = 0,
                ocrUsed = false,
            ),
        ),
    )

    override fun observeRecentItems(): Flow<List<ContentItem>> = recentItems.asStateFlow()

    override suspend fun findBySourceKey(sourceKey: String): ContentItem? {
        return recentItems.value.firstOrNull { it.sourceKey == sourceKey }
    }
}
