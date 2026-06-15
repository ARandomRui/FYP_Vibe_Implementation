package com.scribespeak.app.domain.model

data class ContentItem(
    val id: Long = 0,
    val sourceType: ContentSourceType,
    val sourceKey: String,
    val title: String,
    val originalSource: String,
    val extractedText: String,
    val languageCode: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val lastReadPosition: Int = 0,
    val lastReadParagraphIndex: Int = 0,
    val ocrUsed: Boolean = false
)
