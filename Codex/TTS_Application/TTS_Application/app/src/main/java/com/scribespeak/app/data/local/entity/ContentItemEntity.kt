package com.scribespeak.app.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "content_items",
    indices = [Index(value = ["source_key"], unique = true)]
)
data class ContentItemEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    @ColumnInfo(name = "source_type")
    val sourceType: String,
    @ColumnInfo(name = "source_key")
    val sourceKey: String,
    val title: String,
    @ColumnInfo(name = "original_source")
    val originalSource: String,
    @ColumnInfo(name = "extracted_text")
    val extractedText: String,
    @ColumnInfo(name = "language_code")
    val languageCode: String?,
    @ColumnInfo(name = "created_at")
    val createdAt: Long,
    @ColumnInfo(name = "updated_at")
    val updatedAt: Long,
    @ColumnInfo(name = "last_read_position")
    val lastReadPosition: Int,
    @ColumnInfo(name = "last_read_paragraph_index")
    val lastReadParagraphIndex: Int,
    @ColumnInfo(name = "ocr_used")
    val ocrUsed: Boolean
)
