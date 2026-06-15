package com.scribespeak.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.scribespeak.app.data.local.entity.ContentItemEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ContentItemDao {
    @Query("SELECT * FROM content_items ORDER BY updated_at DESC")
    fun observeLibraryItems(): Flow<List<ContentItemEntity>>

    @Query("SELECT * FROM content_items ORDER BY updated_at DESC LIMIT :limit")
    fun observeRecentItems(limit: Int): Flow<List<ContentItemEntity>>

    @Query("SELECT COUNT(*) FROM content_items")
    fun observeLibraryCount(): Flow<Int>

    @Query("SELECT * FROM content_items WHERE source_key = :sourceKey LIMIT 1")
    suspend fun getBySourceKey(sourceKey: String): ContentItemEntity?

    @Query("SELECT * FROM content_items WHERE id = :id LIMIT 1")
    fun observeItem(id: Long): Flow<ContentItemEntity?>

    @Query(
        """
        UPDATE content_items
        SET last_read_position = :lastReadPosition,
            last_read_paragraph_index = :lastReadParagraphIndex,
            updated_at = :updatedAt
        WHERE id = :id
        """
    )
    suspend fun updateReadingProgress(
        id: Long,
        lastReadPosition: Int,
        lastReadParagraphIndex: Int,
        updatedAt: Long
    )

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: ContentItemEntity): Long
}
