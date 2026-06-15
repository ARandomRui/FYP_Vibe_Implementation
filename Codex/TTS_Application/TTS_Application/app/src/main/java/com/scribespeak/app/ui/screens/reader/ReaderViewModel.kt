package com.scribespeak.app.ui.screens.reader

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.scribespeak.app.domain.language.LanguageDetector
import com.scribespeak.app.domain.model.ContentItem
import com.scribespeak.app.domain.model.SpeechSettings
import com.scribespeak.app.domain.model.SupportedLanguage
import com.scribespeak.app.domain.repository.ContentRepository
import com.scribespeak.app.domain.repository.SettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.Locale
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@HiltViewModel
class ReaderViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val contentRepository: ContentRepository,
    private val settingsRepository: SettingsRepository,
    private val languageDetector: LanguageDetector,
    @ApplicationContext private val context: Context
) : ViewModel() {
    private val contentId: Long = checkNotNull(savedStateHandle.get<Long>("contentId"))
    private val contentState = MutableStateFlow<ContentItem?>(null)
    private val engineState = MutableStateFlow(TtsEngineState.INITIALIZING)
    private val playbackState = MutableStateFlow(PlaybackState.IDLE)
    private val currentParagraphIndex = MutableStateFlow(0)
    private val currentWordHighlight = MutableStateFlow<WordHighlight?>(null)
    private val errorMessage = MutableStateFlow<String?>(null)
    private val speechSettings = MutableStateFlow(SpeechSettings())
    private var restoredProgress = false
    private var pendingPlay = false
    private var textToSpeech: TextToSpeech? = null
    private var activeUtteranceId: String? = null
    private var activeChunks: List<SpeechChunk> = emptyList()
    private var activeChunkIndex: Int = 0

    private val readerSnapshot = combine(
        contentState,
        engineState,
        playbackState,
        currentParagraphIndex
    ) { content, engine, playback, paragraphIndex ->
        val paragraphs = content?.let { splitIntoParagraphs(it.extractedText) }.orEmpty()
        val safeIndex = paragraphIndex.coerceIn(0, maxOf(paragraphs.lastIndex, 0))
        ReaderSnapshot(
            content = content,
            paragraphs = paragraphs,
            currentParagraphIndex = safeIndex,
            isTtsReady = engine == TtsEngineState.READY,
            isPlaying = playback == PlaybackState.PLAYING,
            canResume = playback == PlaybackState.PAUSED,
            canSkipForward = paragraphs.isNotEmpty() && safeIndex < paragraphs.lastIndex,
            canRestart = paragraphs.isNotEmpty() && (safeIndex > 0 || playback != PlaybackState.IDLE),
            isLoadingVoice = engine == TtsEngineState.INITIALIZING,
            statusMessage = buildStatusMessage(engine, playback, safeIndex, paragraphs.size)
        )
    }

    val uiState: StateFlow<ReaderUiState> = combine(
        readerSnapshot,
        currentWordHighlight,
        errorMessage
    ) { snapshot, wordHighlight, error ->
        ReaderUiState(
            content = snapshot.content,
            paragraphs = snapshot.paragraphs,
            currentParagraphIndex = snapshot.currentParagraphIndex,
            currentWordHighlight = if (snapshot.isPlaying) wordHighlight else null,
            isTtsReady = snapshot.isTtsReady,
            isPlaying = snapshot.isPlaying,
            canResume = snapshot.canResume,
            canSkipForward = snapshot.canSkipForward,
            canRestart = snapshot.canRestart,
            isLoadingVoice = snapshot.isLoadingVoice,
            statusMessage = snapshot.statusMessage,
            errorMessage = error
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = ReaderUiState()
    )

    init {
        observeContent()
        observeSpeechSettings()
        initializeTextToSpeech()
    }

    fun play() {
        val content = contentState.value ?: return
        val paragraphs = splitIntoParagraphs(content.extractedText)
        if (paragraphs.isEmpty()) {
            errorMessage.value = "There isn't enough extracted text to read aloud yet."
            return
        }

        if (engineState.value != TtsEngineState.READY) {
            pendingPlay = true
            errorMessage.value = if (engineState.value == TtsEngineState.FAILED) {
                "Text-to-speech isn't ready on this device yet."
            } else {
                "Preparing the speech engine..."
            }
            return
        }

        speakParagraph(
            content = content,
            paragraphs = paragraphs,
            paragraphIndex = currentParagraphIndex.value.coerceIn(0, paragraphs.lastIndex)
        )
    }

    fun stop() {
        pendingPlay = false
        if (playbackState.value == PlaybackState.PLAYING) {
            resetActiveSpeech()
            textToSpeech?.stop()
            playbackState.value = PlaybackState.PAUSED
        }
    }

    fun resume() {
        if (playbackState.value == PlaybackState.PAUSED) {
            play()
        }
    }

    fun skipToNextParagraph() {
        val content = contentState.value ?: return
        val paragraphs = splitIntoParagraphs(content.extractedText)
        if (paragraphs.isEmpty()) return

        val nextIndex = (currentParagraphIndex.value + 1).coerceAtMost(paragraphs.lastIndex)
        if (nextIndex == currentParagraphIndex.value && nextIndex == paragraphs.lastIndex) {
            return
        }

        currentParagraphIndex.value = nextIndex
        persistReadingProgress(nextIndex)

        if (playbackState.value == PlaybackState.PLAYING) {
            resetActiveSpeech()
            textToSpeech?.stop()
            speakParagraph(content, paragraphs, nextIndex)
        }
    }

    fun restart() {
        val content = contentState.value ?: return
        val paragraphs = splitIntoParagraphs(content.extractedText)
        if (paragraphs.isEmpty()) return

        currentParagraphIndex.value = 0
        persistReadingProgress(0)

        if (playbackState.value == PlaybackState.PLAYING) {
            resetActiveSpeech()
            textToSpeech?.stop()
            speakParagraph(content, paragraphs, 0)
        } else {
            resetActiveSpeech()
            playbackState.value = PlaybackState.PAUSED
        }
    }

    override fun onCleared() {
        resetActiveSpeech()
        textToSpeech?.stop()
        textToSpeech?.shutdown()
        super.onCleared()
    }

    private fun observeContent() {
        viewModelScope.launch {
            contentRepository.observeItem(contentId).collect { content ->
                contentState.value = content
                if (!restoredProgress && content != null) {
                    currentParagraphIndex.value = content.lastReadParagraphIndex
                    restoredProgress = true
                }
            }
        }
    }

    private fun observeSpeechSettings() {
        viewModelScope.launch {
            settingsRepository.observeSpeechSettings().collect { settings ->
                speechSettings.value = settings
            }
        }
    }

    private fun initializeTextToSpeech() {
        textToSpeech = TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                textToSpeech?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) = Unit

                    override fun onRangeStart(
                        utteranceId: String?,
                        start: Int,
                        end: Int,
                        frame: Int
                    ) {
                        if (utteranceId != activeUtteranceId) return

                        val chunkOffset = activeChunks.getOrNull(activeChunkIndex)?.startOffset ?: 0
                        currentWordHighlight.value = WordHighlight(
                            start = chunkOffset + start,
                            endExclusive = chunkOffset + end
                        )
                    }

                    override fun onDone(utteranceId: String?) {
                        if (utteranceId != activeUtteranceId) return
                        viewModelScope.launch {
                            handleChunkCompleted()
                        }
                    }

                    override fun onError(utteranceId: String?) {
                        if (utteranceId != activeUtteranceId) return
                        viewModelScope.launch {
                            resetActiveSpeech()
                            errorMessage.value = "The speech engine failed while reading."
                            playbackState.value = PlaybackState.PAUSED
                        }
                    }

                    override fun onError(utteranceId: String?, errorCode: Int) {
                        if (utteranceId != activeUtteranceId) return
                        viewModelScope.launch {
                            resetActiveSpeech()
                            errorMessage.value = when (errorCode) {
                                TextToSpeech.ERROR_INVALID_REQUEST ->
                                    "The speech engine rejected that text chunk. I've reduced chunk sizes, so please try Play again."
                                else -> "The speech engine failed with code $errorCode."
                            }
                            playbackState.value = PlaybackState.PAUSED
                        }
                    }
                })

                engineState.value = TtsEngineState.READY
                errorMessage.value = null
                if (pendingPlay) {
                    pendingPlay = false
                    play()
                }
            } else {
                engineState.value = TtsEngineState.FAILED
                errorMessage.value = "Text-to-speech couldn't initialize on this device."
            }
        }
    }

    private suspend fun handleChunkCompleted() {
        if (playbackState.value != PlaybackState.PLAYING) return

        val content = contentState.value ?: return
        val paragraphs = splitIntoParagraphs(content.extractedText)
        if (paragraphs.isEmpty()) return

        if (activeChunkIndex < activeChunks.lastIndex) {
            speakChunk(
                contentId = content.id,
                paragraphIndex = currentParagraphIndex.value,
                chunks = activeChunks,
                chunkIndex = activeChunkIndex + 1
            )
            return
        }

        handleParagraphCompleted(content, paragraphs)
    }

    private suspend fun handleParagraphCompleted(
        content: ContentItem,
        paragraphs: List<String>
    ) {
        if (playbackState.value != PlaybackState.PLAYING) return

        val nextIndex = currentParagraphIndex.value + 1
        if (nextIndex > paragraphs.lastIndex) {
            resetActiveSpeech()
            playbackState.value = PlaybackState.IDLE
            return
        }

        currentParagraphIndex.value = nextIndex
        persistReadingProgress(nextIndex)
        speakParagraph(content, paragraphs, nextIndex)
    }

    private fun speakParagraph(
        content: ContentItem,
        paragraphs: List<String>,
        paragraphIndex: Int
    ) {
        val tts = textToSpeech ?: return
        val paragraph = paragraphs.getOrNull(paragraphIndex) ?: return

        if (!setLanguageForContent(tts, content, speechSettings.value)) {
            resetActiveSpeech()
            playbackState.value = PlaybackState.PAUSED
            errorMessage.value = "No compatible offline voice is available for this article right now."
            return
        }

        val chunks = buildSpeechChunks(paragraph)
        if (chunks.isEmpty()) {
            resetActiveSpeech()
            errorMessage.value = "There isn't enough extracted text to read aloud yet."
            playbackState.value = PlaybackState.PAUSED
            return
        }

        currentParagraphIndex.value = paragraphIndex
        persistReadingProgress(paragraphIndex)
        errorMessage.value = null
        playbackState.value = PlaybackState.PLAYING

        speakChunk(
            contentId = content.id,
            paragraphIndex = paragraphIndex,
            chunks = chunks,
            chunkIndex = 0
        )
    }

    private fun setLanguageForContent(
        tts: TextToSpeech,
        content: ContentItem,
        settings: SpeechSettings
    ): Boolean {
        val targetLanguageCode = if (settings.autoDetectLanguage) {
            content.languageCode
                ?.takeIf { it.isNotBlank() }
                ?: languageDetector.detectLanguageCode(content.extractedText)
                ?: Locale.getDefault().language
        } else {
            settings.preferredLanguageCode
        }

        val localeTag = SupportedLanguage.fromCode(targetLanguageCode)?.localeTag ?: targetLanguageCode
        val requestedLocale = localeTag
            .takeIf { it.isNotBlank() }
            ?.let(Locale::forLanguageTag)

        val requestedResult = requestedLocale?.let { locale ->
            tts.setLanguage(locale)
        }

        val localeUnsupported = requestedResult == TextToSpeech.LANG_MISSING_DATA ||
            requestedResult == TextToSpeech.LANG_NOT_SUPPORTED

        if (requestedLocale == null || localeUnsupported) {
            val fallbackResult = tts.setLanguage(Locale.getDefault())
            if (fallbackResult == TextToSpeech.LANG_MISSING_DATA ||
                fallbackResult == TextToSpeech.LANG_NOT_SUPPORTED
            ) {
                return false
            }
        }

        return true
    }

    private fun persistReadingProgress(paragraphIndex: Int) {
        viewModelScope.launch {
            contentRepository.updateReadingProgress(
                id = contentId,
                lastReadPosition = 0,
                lastReadParagraphIndex = paragraphIndex
            )
        }
    }

    private fun speakChunk(
        contentId: Long,
        paragraphIndex: Int,
        chunks: List<SpeechChunk>,
        chunkIndex: Int
    ) {
        val tts = textToSpeech ?: return
        val chunk = chunks.getOrNull(chunkIndex) ?: return

        activeChunks = chunks
        activeChunkIndex = chunkIndex
        currentWordHighlight.value = null

        val utteranceId = "$contentId-$paragraphIndex-$chunkIndex-${System.currentTimeMillis()}"
        activeUtteranceId = utteranceId

        val speakResult = tts.speak(chunk.text, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
        if (speakResult != TextToSpeech.SUCCESS) {
            resetActiveSpeech()
            playbackState.value = PlaybackState.PAUSED
            errorMessage.value = "The speech engine couldn't start that text chunk. Please try Play again."
        }
    }

    private fun buildSpeechChunks(paragraph: String): List<SpeechChunk> {
        val maxChunkLength = (TextToSpeech.getMaxSpeechInputLength() - 200).coerceAtLeast(500)
        val wordMatches = Regex("\\S+").findAll(paragraph).toList()
        if (wordMatches.isEmpty()) return emptyList()

        val chunks = mutableListOf<SpeechChunk>()
        var chunkStart = wordMatches.first().range.first
        var chunkEnd = wordMatches.first().range.last + 1

        for (index in 1 until wordMatches.size) {
            val nextWord = wordMatches[index]
            val nextEnd = nextWord.range.last + 1

            if (nextEnd - chunkStart > maxChunkLength) {
                chunks += SpeechChunk(
                    text = paragraph.substring(chunkStart, chunkEnd).trim(),
                    startOffset = chunkStart
                )
                chunkStart = nextWord.range.first
            }

            chunkEnd = nextEnd
        }

        chunks += SpeechChunk(
            text = paragraph.substring(chunkStart, chunkEnd).trim(),
            startOffset = chunkStart
        )

        return chunks.filter { it.text.isNotBlank() }
    }

    private fun resetActiveSpeech() {
        activeUtteranceId = null
        activeChunks = emptyList()
        activeChunkIndex = 0
        currentWordHighlight.value = null
    }

    private fun buildStatusMessage(
        engineState: TtsEngineState,
        playbackState: PlaybackState,
        currentParagraphIndex: Int,
        paragraphCount: Int
    ): String {
        if (paragraphCount == 0) return "No readable paragraphs detected yet."

        return when {
            engineState == TtsEngineState.INITIALIZING -> "Preparing text-to-speech..."
            engineState == TtsEngineState.FAILED -> "Text-to-speech is unavailable on this device."
            playbackState == PlaybackState.PLAYING ->
                "Reading paragraph ${currentParagraphIndex + 1} of $paragraphCount"
            playbackState == PlaybackState.PAUSED ->
                "Paused at paragraph ${currentParagraphIndex + 1} of $paragraphCount"
            else ->
                "Ready to read from paragraph ${currentParagraphIndex + 1} of $paragraphCount"
        }
    }

    private fun splitIntoParagraphs(text: String): List<String> {
        return text.split(Regex("\\n\\s*\\n+"))
            .map { it.trim() }
            .filter { it.length >= 20 }
            .ifEmpty {
                text.split(Regex("(?<=[.!?])\\s+"))
                    .map { it.trim() }
                    .filter { it.length >= 20 }
            }
    }
}

data class ReaderUiState(
    val content: ContentItem? = null,
    val paragraphs: List<String> = emptyList(),
    val currentParagraphIndex: Int = 0,
    val currentWordHighlight: WordHighlight? = null,
    val isTtsReady: Boolean = false,
    val isPlaying: Boolean = false,
    val canResume: Boolean = false,
    val canSkipForward: Boolean = false,
    val canRestart: Boolean = false,
    val isLoadingVoice: Boolean = false,
    val statusMessage: String = "Loading reader...",
    val errorMessage: String? = null
)

data class WordHighlight(
    val start: Int,
    val endExclusive: Int
)

private data class ReaderSnapshot(
    val content: ContentItem? = null,
    val paragraphs: List<String> = emptyList(),
    val currentParagraphIndex: Int = 0,
    val isTtsReady: Boolean = false,
    val isPlaying: Boolean = false,
    val canResume: Boolean = false,
    val canSkipForward: Boolean = false,
    val canRestart: Boolean = false,
    val isLoadingVoice: Boolean = false,
    val statusMessage: String = "Loading reader..."
)

private data class SpeechChunk(
    val text: String,
    val startOffset: Int
)

private enum class TtsEngineState {
    INITIALIZING,
    READY,
    FAILED
}

private enum class PlaybackState {
    IDLE,
    PLAYING,
    PAUSED
}
