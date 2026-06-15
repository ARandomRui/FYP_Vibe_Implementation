package com.scribespeak.app.domain.extract

data class PdfTextResult(
    val sourceKey: String,
    val title: String,
    val originalSource: String,
    val extractedText: String
)
