package com.scribespeak.app.ui.screens.reader

import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedIconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.pointerInteropFilter
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import android.view.MotionEvent

@Composable
fun ReaderRoute(
    onGoBack: () -> Unit,
    viewModel: ReaderViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()
    var isAutoFollowEnabled by rememberSaveable { mutableStateOf(true) }
    var isUserTouchingReader by remember { mutableStateOf(false) }
    val paragraphRequesters = remember(uiState.paragraphs) {
        uiState.paragraphs.map { BringIntoViewRequester() }
    }
    val manualScrollDisabler = remember(isAutoFollowEnabled, isUserTouchingReader) {
        object : NestedScrollConnection {
            override fun onPreScroll(
                available: Offset,
                source: NestedScrollSource
            ): Offset {
                if (isAutoFollowEnabled &&
                    isUserTouchingReader &&
                    source == NestedScrollSource.Drag
                ) {
                    isAutoFollowEnabled = false
                }
                return Offset.Zero
            }
        }
    }

    LaunchedEffect(uiState.currentParagraphIndex, uiState.isPlaying, isAutoFollowEnabled) {
        if (isAutoFollowEnabled && uiState.isPlaying) {
            paragraphRequesters
                .getOrNull(uiState.currentParagraphIndex)
                ?.bringIntoView()
        }
    }

    Surface(modifier = Modifier.fillMaxSize()) {
        val content = uiState.content
        if (content == null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Nothing loaded yet",
                    style = MaterialTheme.typography.headlineSmall
                )
                Text(
                    text = "Import a URL first, then the extracted article will open here.",
                    style = MaterialTheme.typography.bodyLarge
                )
            }
        } else {
            BoxWithConstraints(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp)
            ) {
                val isLandscape = maxWidth > maxHeight

                if (isLandscape) {
                    Row(
                        modifier = Modifier.fillMaxSize(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .widthIn(min = 260.dp, max = 360.dp)
                                .fillMaxHeight()
                                .verticalScroll(rememberScrollState()),
                            verticalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            ReaderHeader(
                                title = content.title,
                                source = content.originalSource,
                                onGoBack = onGoBack
                            )
                            PlaybackPanel(
                                uiState = uiState,
                                isAutoFollowEnabled = isAutoFollowEnabled,
                                onToggleAutoFollow = {
                                    isUserTouchingReader = false
                                    isAutoFollowEnabled = !isAutoFollowEnabled
                                },
                                onPlayOrResume = {
                                    if (uiState.canResume) viewModel.resume() else viewModel.play()
                                },
                                onStop = viewModel::stop,
                                onRestart = viewModel::restart,
                                onNext = viewModel::skipToNextParagraph
                            )
                            ReaderErrorCard(message = uiState.errorMessage)
                        }

                        ReaderParagraphList(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight(),
                            uiState = uiState,
                            paragraphRequesters = paragraphRequesters,
                            scrollState = scrollState,
                            manualScrollDisabler = manualScrollDisabler,
                            isAutoFollowEnabled = isAutoFollowEnabled,
                            onDisableAutoFollow = { isAutoFollowEnabled = false },
                            onUserTouchChanged = { isUserTouchingReader = it }
                        )
                    }
                } else {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        ReaderHeader(
                            title = content.title,
                            source = content.originalSource,
                            onGoBack = onGoBack
                        )
                        PlaybackPanel(
                            uiState = uiState,
                            isAutoFollowEnabled = isAutoFollowEnabled,
                            onToggleAutoFollow = {
                                isUserTouchingReader = false
                                isAutoFollowEnabled = !isAutoFollowEnabled
                            },
                            onPlayOrResume = {
                                if (uiState.canResume) viewModel.resume() else viewModel.play()
                            },
                            onStop = viewModel::stop,
                            onRestart = viewModel::restart,
                            onNext = viewModel::skipToNextParagraph
                        )
                        ReaderErrorCard(message = uiState.errorMessage)
                        ReaderParagraphList(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth(),
                            uiState = uiState,
                            paragraphRequesters = paragraphRequesters,
                            scrollState = scrollState,
                            manualScrollDisabler = manualScrollDisabler,
                            isAutoFollowEnabled = isAutoFollowEnabled,
                            onDisableAutoFollow = { isAutoFollowEnabled = false },
                            onUserTouchChanged = { isUserTouchingReader = it }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ReaderHeader(
    title: String,
    source: String,
    onGoBack: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        OutlinedIconButton(
            onClick = onGoBack
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Go back"
            )
        }
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = source,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun PlaybackPanel(
    uiState: ReaderUiState,
    isAutoFollowEnabled: Boolean,
    onToggleAutoFollow: () -> Unit,
    onPlayOrResume: () -> Unit,
    onStop: () -> Unit,
    onRestart: () -> Unit,
    onNext: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer
        ),
        shape = RoundedCornerShape(24.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = "Playback",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = uiState.statusMessage,
                style = MaterialTheme.typography.bodyMedium
            )
            if (uiState.isLoadingVoice) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    CircularProgressIndicator(modifier = Modifier.width(20.dp))
                    Text(
                        text = "Initializing Android text-to-speech",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    FilledIconButton(
                        onClick = onPlayOrResume,
                        enabled = uiState.paragraphs.isNotEmpty()
                    ) {
                        Icon(
                            imageVector = Icons.Filled.PlayArrow,
                            contentDescription = if (uiState.canResume) "Resume" else "Play"
                        )
                    }
                    OutlinedIconButton(
                        onClick = onStop,
                        enabled = uiState.isPlaying
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Stop,
                            contentDescription = "Stop"
                        )
                    }
                    OutlinedIconButton(
                        onClick = onRestart,
                        enabled = uiState.canRestart
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Refresh,
                            contentDescription = "Restart"
                        )
                    }
                    OutlinedIconButton(
                        onClick = onNext,
                        enabled = uiState.canSkipForward
                    ) {
                        Icon(
                            imageVector = Icons.Filled.SkipNext,
                            contentDescription = "Next paragraph"
                        )
                    }
                    if (isAutoFollowEnabled) {
                        FilledIconButton(onClick = onToggleAutoFollow) {
                            Icon(
                                imageVector = Icons.Filled.Visibility,
                                contentDescription = "Disable auto follow"
                            )
                        }
                    } else {
                        OutlinedIconButton(onClick = onToggleAutoFollow) {
                            Icon(
                                imageVector = Icons.Filled.VisibilityOff,
                                contentDescription = "Enable auto follow"
                            )
                        }
                    }
                }
            }
            Text(
                text = if (isAutoFollowEnabled) "Auto follow is on" else "Auto follow is off",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSecondaryContainer
            )
        }
    }
}

@Composable
private fun ReaderErrorCard(message: String?) {
    message?.let {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.errorContainer
            ),
            shape = RoundedCornerShape(20.dp)
        ) {
            Text(
                text = it,
                modifier = Modifier.padding(16.dp),
                color = MaterialTheme.colorScheme.onErrorContainer
            )
        }
    }
}

@Composable
private fun ReaderParagraphList(
    modifier: Modifier,
    uiState: ReaderUiState,
    paragraphRequesters: List<BringIntoViewRequester>,
    scrollState: androidx.compose.foundation.ScrollState,
    manualScrollDisabler: NestedScrollConnection,
    isAutoFollowEnabled: Boolean,
    onDisableAutoFollow: () -> Unit,
    onUserTouchChanged: (Boolean) -> Unit
) {
    Column(
        modifier = modifier
            .nestedScroll(manualScrollDisabler)
            .pointerInteropFilter { motionEvent ->
                when (motionEvent.actionMasked) {
                    MotionEvent.ACTION_DOWN -> onUserTouchChanged(true)
                    MotionEvent.ACTION_UP,
                    MotionEvent.ACTION_CANCEL -> onUserTouchChanged(false)
                }
                false
            }
            .verticalScroll(scrollState)
            .pointerInput(isAutoFollowEnabled) {
                detectTapGestures {
                    if (isAutoFollowEnabled) {
                        onDisableAutoFollow()
                    }
                }
            }
    ) {
        uiState.paragraphs.forEachIndexed { index, paragraph ->
            ReaderParagraphCard(
                index = index,
                paragraph = paragraph,
                isActive = index == uiState.currentParagraphIndex,
                currentWordHighlight = uiState.currentWordHighlight,
                isAutoFollowEnabled = isAutoFollowEnabled,
                paragraphRequester = paragraphRequesters[index]
            )
        }
    }
}

@Composable
private fun ReaderParagraphCard(
    index: Int,
    paragraph: String,
    isActive: Boolean,
    currentWordHighlight: WordHighlight?,
    isAutoFollowEnabled: Boolean,
    paragraphRequester: BringIntoViewRequester
) {
    val wordRequester = remember { BringIntoViewRequester() }
    var layoutResult by remember(paragraph) { mutableStateOf<TextLayoutResult?>(null) }
    val paragraphText = if (isActive) {
        buildAnnotatedString {
            append(paragraph)
            if (currentWordHighlight != null &&
                currentWordHighlight.start in paragraph.indices &&
                currentWordHighlight.endExclusive > currentWordHighlight.start
            ) {
                addStyle(
                    style = SpanStyle(textDecoration = TextDecoration.Underline),
                    start = currentWordHighlight.start,
                    end = minOf(currentWordHighlight.endExclusive, paragraph.length)
                )
            }
        }
    } else {
        buildAnnotatedString { append(paragraph) }
    }

    LaunchedEffect(
        isActive,
        isAutoFollowEnabled,
        currentWordHighlight?.start,
        currentWordHighlight?.endExclusive,
        paragraph
    ) {
        if (!isActive || !isAutoFollowEnabled) return@LaunchedEffect

        val highlight = currentWordHighlight ?: return@LaunchedEffect
        val layout = layoutResult ?: return@LaunchedEffect
        if (paragraph.isEmpty()) return@LaunchedEffect

        val safeOffset = highlight.start.coerceIn(0, paragraph.lastIndex)
        val wordBounds = layout.getBoundingBox(safeOffset)
        val viewportPadding = 220f
        val rect = Rect(
            left = 0f,
            top = (wordBounds.top - viewportPadding).coerceAtLeast(0f),
            right = layout.size.width.toFloat(),
            bottom = (wordBounds.bottom + viewportPadding).coerceAtMost(layout.size.height.toFloat())
        )
        wordRequester.bringIntoView(rect)
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 14.dp)
            .bringIntoViewRequester(paragraphRequester),
        colors = CardDefaults.cardColors(
            containerColor = if (isActive) {
                MaterialTheme.colorScheme.primaryContainer
            } else {
                MaterialTheme.colorScheme.surfaceContainerLow
            }
        ),
        shape = RoundedCornerShape(24.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Paragraph ${index + 1}",
                style = MaterialTheme.typography.labelLarge,
                color = if (isActive) {
                    MaterialTheme.colorScheme.onPrimaryContainer
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                }
            )
            Text(
                text = paragraphText,
                modifier = Modifier.bringIntoViewRequester(wordRequester),
                style = MaterialTheme.typography.bodyLarge,
                maxLines = if (isActive) Int.MAX_VALUE else 5,
                overflow = TextOverflow.Ellipsis,
                onTextLayout = { layoutResult = it }
            )
        }
    }
}
