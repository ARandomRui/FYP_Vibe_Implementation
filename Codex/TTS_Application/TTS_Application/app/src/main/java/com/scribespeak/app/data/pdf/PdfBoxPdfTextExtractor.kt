package com.scribespeak.app.data.pdf

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import com.scribespeak.app.domain.extract.PdfTextExtractor
import com.scribespeak.app.domain.extract.PdfTextResult
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import dagger.hilt.android.qualifiers.ApplicationContext
import java.security.MessageDigest
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Singleton
class PdfBoxPdfTextExtractor @Inject constructor(
    @ApplicationContext private val context: Context
) : PdfTextExtractor {
    init {
        PDFBoxResourceLoader.init(context)
    }

    override suspend fun extract(uri: Uri): PdfTextResult = withContext(Dispatchers.IO) {
        val contentResolver = context.contentResolver
        val displayName = resolveDisplayName(uri) ?: "Imported PDF"
        val sourceKey = "pdf:${hashContent(uri)}"

        val extractedText = contentResolver.openInputStream(uri)?.use { inputStream ->
            PDDocument.load(inputStream).use { document ->
                PDFTextStripper().getText(document)
            }
        }?.trim().orEmpty()

        if (extractedText.length < 80) {
            throw IllegalStateException(
                "This PDF doesn't expose enough embedded text yet. OCR fallback for scanned PDFs is still the next feature to wire."
            )
        }

        PdfTextResult(
            sourceKey = sourceKey,
            title = displayName,
            originalSource = displayName,
            extractedText = extractedText
        )
    }

    private fun hashContent(uri: Uri): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val contentResolver = context.contentResolver
        contentResolver.openInputStream(uri)?.use { inputStream ->
            val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
            while (true) {
                val read = inputStream.read(buffer)
                if (read <= 0) break
                digest.update(buffer, 0, read)
            }
        } ?: throw IllegalStateException("Couldn't open the selected PDF.")

        return digest.digest().joinToString("") { byte ->
            "%02x".format(byte)
        }
    }

    private fun resolveDisplayName(uri: Uri): String? {
        val contentResolver = context.contentResolver
        return contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
            ?.use { cursor ->
                if (cursor.moveToFirst()) {
                    cursor.getString(cursor.getColumnIndexOrThrow(OpenableColumns.DISPLAY_NAME))
                } else {
                    null
                }
            }
    }
}
