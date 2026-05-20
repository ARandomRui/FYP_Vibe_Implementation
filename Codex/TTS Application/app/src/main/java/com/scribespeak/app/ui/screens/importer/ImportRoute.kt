package com.scribespeak.app.ui.screens.importer

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.scribespeak.app.ui.components.SectionCard

@Composable
fun ImportRoute(
    sharedText: String?,
    viewModel: ImportViewModel,
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(sharedText) {
        viewModel.preloadSharedText(sharedText)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        SectionCard(
            title = "Import a web article",
            subtitle = "Paste a public article URL or open ScribeSpeak from the Android sharesheet.",
        ) {
            OutlinedTextField(
                value = uiState.url,
                onValueChange = viewModel::onUrlChanged,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Article URL") },
                singleLine = true,
            )
            Button(onClick = { }, modifier = Modifier.fillMaxWidth()) {
                Text("Extract Article")
            }
        }

        SectionCard(
            title = "Import a PDF",
            subtitle = "The next implementation step will connect the local file picker and add OCR fallback for scanned documents.",
        ) {
            Button(onClick = { }, modifier = Modifier.fillMaxWidth()) {
                Text("Choose PDF")
            }
        }

        Text(
            text = uiState.statusMessage,
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}
