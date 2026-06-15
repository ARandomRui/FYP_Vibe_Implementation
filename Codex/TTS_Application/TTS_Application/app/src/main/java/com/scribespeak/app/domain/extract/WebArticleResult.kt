package com.scribespeak.app.domain.extract

data class WebArticleResult(
    val normalizedUrl: String,
    val title: String,
    val extractedText: String,
    val languageCode: String?
)
