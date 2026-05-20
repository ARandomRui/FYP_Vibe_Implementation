package com.scribespeak.app.domain.model

data class ContentItem(
    val id: Long,
    val title: String,
    val originalSource: String,
    val sourceKey: String,
    val sourceType: SourceType,
    val extractedText: String,
    val languageCode: String?,
    val lastReadParagraphIndex: Int,
    val ocrUsed: Boolean,
)

enum class SourceType {
    WEB,
    PDF,
}
