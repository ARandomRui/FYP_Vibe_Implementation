package com.scribespeak.app.domain.repository

import com.scribespeak.app.domain.model.ContentItem
import kotlinx.coroutines.flow.Flow

interface ContentRepository {
    fun observeLibraryItems(): Flow<List<ContentItem>>

    fun observeRecentItems(limit: Int = 5): Flow<List<ContentItem>>

    fun observeLibraryCount(): Flow<Int>

    suspend fun getBySourceKey(sourceKey: String): ContentItem?

    fun observeItem(id: Long): Flow<ContentItem?>

    suspend fun updateReadingProgress(
        id: Long,
        lastReadPosition: Int,
        lastReadParagraphIndex: Int
    )

    suspend fun upsert(item: ContentItem): Long
}
