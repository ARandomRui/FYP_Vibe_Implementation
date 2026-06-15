package com.scribespeak.app.ui.screens.importer

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.scribespeak.app.domain.extract.PdfTextExtractor
import com.scribespeak.app.domain.extract.WebArticleExtractor
import com.scribespeak.app.domain.model.ContentItem
import com.scribespeak.app.domain.model.ContentSourceType
import com.scribespeak.app.domain.repository.ContentRepository
import com.scribespeak.app.domain.util.normalizeUrl
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@HiltViewModel
class ImportViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    private val webArticleExtractor: WebArticleExtractor,
    private val pdfTextExtractor: PdfTextExtractor
) : ViewModel() {
    private val _uiState = MutableStateFlow(ImportUiState())
    val uiState: StateFlow<ImportUiState> = _uiState.asStateFlow()

    private val navigationEvents = Channel<Long>(capacity = Channel.BUFFERED)
    val openReaderEvents = navigationEvents.receiveAsFlow()

    fun onUrlChanged(value: String) {
        _uiState.update { state ->
            state.copy(
                urlInput = value,
                error = null
            )
        }
    }

    fun acceptSharedUrl(url: String) {
        if (url == _uiState.value.lastImportedUrl && _uiState.value.result != null) {
            return
        }

        _uiState.update { state ->
            state.copy(
                urlInput = url,
                error = null
            )
        }
        importUrl()
    }

    fun importUrl() {
        val rawUrl = _uiState.value.urlInput
        val normalizedUrl = try {
            normalizeUrl(rawUrl)
        } catch (error: IllegalArgumentException) {
            _uiState.update { state ->
                state.copy(
                    error = ImportErrorUi(
                        title = "Invalid URL",
                        message = error.message ?: "Enter a valid article URL."
                    )
                )
            }
            return
        }

        viewModelScope.launch {
            startLoading("Extracting article...")

            runCatching {
                val cached = contentRepository.getBySourceKey(normalizedUrl)
                if (cached != null) {
                    ImportResult(
                        contentId = cached.id,
                        sourceType = ContentSourceType.WEB,
                        title = cached.title,
                        originalSource = cached.originalSource,
                        preview = cached.extractedText.take(260),
                        isCached = true
                    )
                } else {
                    val article = webArticleExtractor.extract(normalizedUrl)
                    val now = System.currentTimeMillis()
                    val contentId = contentRepository.upsert(
                        ContentItem(
                            sourceType = ContentSourceType.WEB,
                            sourceKey = article.normalizedUrl,
                            title = article.title,
                            originalSource = article.normalizedUrl,
                            extractedText = article.extractedText,
                            languageCode = article.languageCode,
                            createdAt = now,
                            updatedAt = now
                        )
                    )

                    ImportResult(
                        contentId = contentId,
                        sourceType = ContentSourceType.WEB,
                        title = article.title,
                        originalSource = article.normalizedUrl,
                        preview = article.extractedText.take(260),
                        isCached = false
                    )
                }
            }.onSuccess { result ->
                _uiState.update { state ->
                    state.copy(
                        isLoading = false,
                        result = result,
                        loadingLabel = null,
                        lastImportedUrl = normalizedUrl
                    )
                }
                navigationEvents.send(result.contentId)
            }.onFailure { error ->
                _uiState.update { state ->
                    state.copy(
                        isLoading = false,
                        loadingLabel = null,
                        error = toUrlImportError(error)
                    )
                }
            }
        }
    }

    fun importPdf(uri: Uri) {
        viewModelScope.launch {
            startLoading("Importing PDF...")

            runCatching {
                val extractedPdf = pdfTextExtractor.extract(uri)
                val cached = contentRepository.getBySourceKey(extractedPdf.sourceKey)
                if (cached != null) {
                    ImportResult(
                        contentId = cached.id,
                        sourceType = ContentSourceType.PDF,
                        title = cached.title,
                        originalSource = cached.originalSource,
                        preview = cached.extractedText.take(260),
                        isCached = true
                    )
                } else {
                    val now = System.currentTimeMillis()
                    val contentId = contentRepository.upsert(
                        ContentItem(
                            sourceType = ContentSourceType.PDF,
                            sourceKey = extractedPdf.sourceKey,
                            title = extractedPdf.title,
                            originalSource = extractedPdf.originalSource,
                            extractedText = extractedPdf.extractedText,
                            createdAt = now,
                            updatedAt = now
                        )
                    )

                    ImportResult(
                        contentId = contentId,
                        sourceType = ContentSourceType.PDF,
                        title = extractedPdf.title,
                        originalSource = extractedPdf.originalSource,
                        preview = extractedPdf.extractedText.take(260),
                        isCached = false
                    )
                }
            }.onSuccess { result ->
                _uiState.update { state ->
                    state.copy(
                        isLoading = false,
                        loadingLabel = null,
                        result = result
                    )
                }
                navigationEvents.send(result.contentId)
            }.onFailure { error ->
                _uiState.update { state ->
                    state.copy(
                        isLoading = false,
                        loadingLabel = null,
                        error = ImportErrorUi(
                            title = "PDF import failed",
                            message = error.message ?: "Something went wrong while importing that PDF."
                        )
                    )
                }
            }
        }
    }

    private fun startLoading(label: String) {
        _uiState.update { state ->
            state.copy(
                isLoading = true,
                loadingLabel = label,
                error = null,
                result = null
            )
        }
    }

    private fun toUrlImportError(error: Throwable): ImportErrorUi {
        val rawMessage = error.message?.trim().orEmpty()
        val normalized = rawMessage.lowercase()

        return when {
            normalized.contains("paywall") ||
                normalized.contains("app-only gate") ||
                normalized.contains("subscribe") ||
                normalized.contains("subscriber only") ||
                normalized.contains("members only") -> {
                ImportErrorUi(
                    title = "Paywalled article",
                    message = "This article appears to be paywalled or only partially available.",
                    detail = "ScribeSpeak currently imports public, fully readable article pages only."
                )
            }

            normalized.contains("couldn't find enough readable article text") ||
                normalized.contains("empty content") -> {
                ImportErrorUi(
                    title = "Article text unavailable",
                    message = "ScribeSpeak couldn't find enough of the main article text on that page.",
                    detail = "This usually means the page is teaser-only, heavily scripted, or not exposing the full article body."
                )
            }

            else -> {
                ImportErrorUi(
                    title = "Import failed",
                    message = rawMessage.ifBlank {
                        "Something went wrong while extracting that page."
                    }
                )
            }
        }
    }
}

data class ImportUiState(
    val urlInput: String = "",
    val isLoading: Boolean = false,
    val loadingLabel: String? = null,
    val error: ImportErrorUi? = null,
    val result: ImportResult? = null,
    val lastImportedUrl: String? = null
)

data class ImportErrorUi(
    val title: String,
    val message: String,
    val detail: String? = null
)

data class ImportResult(
    val contentId: Long,
    val sourceType: ContentSourceType,
    val title: String,
    val originalSource: String,
    val preview: String,
    val isCached: Boolean
)
