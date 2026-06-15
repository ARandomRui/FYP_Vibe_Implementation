package com.scribespeak.app.ui.screens.importer

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.flow.collectLatest

@Composable
fun ImportRoute(
    sharedUrl: String?,
    onSharedUrlConsumed: () -> Unit,
    onOpenReader: (Long) -> Unit,
    viewModel: ImportViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val pdfPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        if (uri != null) {
            viewModel.importPdf(uri)
        }
    }

    LaunchedEffect(sharedUrl) {
        if (!sharedUrl.isNullOrBlank()) {
            viewModel.acceptSharedUrl(sharedUrl)
            onSharedUrlConsumed()
        }
    }

    LaunchedEffect(viewModel) {
        viewModel.openReaderEvents.collectLatest { contentId ->
            onOpenReader(contentId)
        }
    }

    ImportScreen(
        uiState = uiState,
        onUrlChanged = viewModel::onUrlChanged,
        onImportClick = viewModel::importUrl,
        onPickPdfClick = {
            pdfPickerLauncher.launch(arrayOf("application/pdf"))
        }
    )
}

@Composable
private fun ImportScreen(
    uiState: ImportUiState,
    onUrlChanged: (String) -> Unit,
    onImportClick: () -> Unit,
    onPickPdfClick: () -> Unit
) {
    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "Import Content",
                style = MaterialTheme.typography.headlineMedium
            )
            Text(
                text = "Paste a public article URL here, share a link into ScribeSpeak, or import a PDF from local storage.",
                style = MaterialTheme.typography.bodyLarge
            )
            OutlinedTextField(
                value = uiState.urlInput,
                onValueChange = onUrlChanged,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Article URL") },
                placeholder = { Text("https://example.com/article") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                supportingText = {
                    Text("Version 1 supports public HTTP/HTTPS pages. Paywalled or app-only articles may be rejected.")
                },
                isError = uiState.error != null
            )
            Button(
                onClick = onImportClick,
                enabled = !uiState.isLoading,
                modifier = Modifier.fillMaxWidth()
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(
                        strokeWidth = 2.dp,
                        modifier = Modifier.padding(end = 12.dp)
                    )
                }
                Text(if (uiState.isLoading) (uiState.loadingLabel ?: "Working...") else "Extract Article")
            }
            Button(
                onClick = onPickPdfClick,
                enabled = !uiState.isLoading,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Pick PDF")
            }
            Text(
                text = "PDF import currently supports embedded text PDFs. OCR fallback for scanned PDFs is the next feature pass.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            uiState.error?.let { error ->
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    )
                    {
                        Text(
                            text = error.title,
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                        Text(
                            text = error.message,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                        error.detail?.let { detail ->
                            Text(
                                text = detail,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onErrorContainer
                            )
                        }
                    }
                }
            }

            uiState.result?.let { result ->
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = if (result.isCached) {
                                "Loaded ${result.sourceType.label} from cache"
                            } else {
                                "${result.sourceType.label} import complete"
                            },
                            style = MaterialTheme.typography.labelLarge
                        )
                        Text(
                            text = result.title,
                            style = MaterialTheme.typography.titleLarge
                        )
                        Text(
                            text = result.originalSource,
                            style = MaterialTheme.typography.bodySmall
                        )
                        Text(
                            text = result.preview,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }
    }
}
