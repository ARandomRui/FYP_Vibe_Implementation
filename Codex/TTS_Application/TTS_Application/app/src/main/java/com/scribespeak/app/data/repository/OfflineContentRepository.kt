package com.scribespeak.app.data.repository

import com.scribespeak.app.data.local.dao.ContentItemDao
import com.scribespeak.app.data.local.entity.ContentItemEntity
import com.scribespeak.app.domain.model.ContentItem
import com.scribespeak.app.domain.model.ContentSourceType
import com.scribespeak.app.domain.repository.ContentRepository
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Singleton
class OfflineContentRepository @Inject constructor(
    private val contentItemDao: ContentItemDao
) : ContentRepository {
    override fun observeLibraryItems(): Flow<List<ContentItem>> {
        return contentItemDao.observeLibraryItems().map { items ->
            items.map(ContentItemEntity::toDomain)
        }
    }

    override fun observeRecentItems(limit: Int): Flow<List<ContentItem>> {
        return contentItemDao.observeRecentItems(limit).map { items ->
            items.map(ContentItemEntity::toDomain)
        }
    }

    override fun observeLibraryCount(): Flow<Int> = contentItemDao.observeLibraryCount()

    override suspend fun getBySourceKey(sourceKey: String): ContentItem? {
        return contentItemDao.getBySourceKey(sourceKey)?.toDomain()
    }

    override fun observeItem(id: Long): Flow<ContentItem?> {
        return contentItemDao.observeItem(id).map { entity ->
            entity?.toDomain()
        }
    }

    override suspend fun updateReadingProgress(
        id: Long,
        lastReadPosition: Int,
        lastReadParagraphIndex: Int
    ) {
        contentItemDao.updateReadingProgress(
            id = id,
            lastReadPosition = lastReadPosition,
            lastReadParagraphIndex = lastReadParagraphIndex,
            updatedAt = System.currentTimeMillis()
        )
    }

    override suspend fun upsert(item: ContentItem): Long = contentItemDao.upsert(item.toEntity())
}

private fun ContentItemEntity.toDomain(): ContentItem {
    return ContentItem(
        id = id,
        sourceType = ContentSourceType.fromStorageValue(sourceType),
        sourceKey = sourceKey,
        title = title,
        originalSource = originalSource,
        extractedText = extractedText,
        languageCode = languageCode,
        createdAt = createdAt,
        updatedAt = updatedAt,
        lastReadPosition = lastReadPosition,
        lastReadParagraphIndex = lastReadParagraphIndex,
        ocrUsed = ocrUsed
    )
}

private fun ContentItem.toEntity(): ContentItemEntity {
    return ContentItemEntity(
        id = id,
        sourceType = sourceType.storageValue,
        sourceKey = sourceKey,
        title = title,
        originalSource = originalSource,
        extractedText = extractedText,
        languageCode = languageCode,
        createdAt = createdAt,
        updatedAt = updatedAt,
        lastReadPosition = lastReadPosition,
        lastReadParagraphIndex = lastReadParagraphIndex,
        ocrUsed = ocrUsed
    )
}
