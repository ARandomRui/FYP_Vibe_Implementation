package com.scribespeak.app.domain.extract

import android.net.Uri

interface PdfTextExtractor {
    suspend fun extract(uri: Uri): PdfTextResult
}
