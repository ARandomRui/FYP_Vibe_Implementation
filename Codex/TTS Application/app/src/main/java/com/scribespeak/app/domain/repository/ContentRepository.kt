package com.scribespeak.app.domain.repository

import com.scribespeak.app.domain.model.ContentItem
import kotlinx.coroutines.flow.Flow

interface ContentRepository {
    fun observeRecentItems(): Flow<List<ContentItem>>
    suspend fun findBySourceKey(sourceKey: String): ContentItem?
}
