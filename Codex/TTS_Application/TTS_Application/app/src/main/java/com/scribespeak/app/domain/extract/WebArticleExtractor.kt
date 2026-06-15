package com.scribespeak.app.domain.extract

interface WebArticleExtractor {
    suspend fun extract(url: String): WebArticleResult
}
