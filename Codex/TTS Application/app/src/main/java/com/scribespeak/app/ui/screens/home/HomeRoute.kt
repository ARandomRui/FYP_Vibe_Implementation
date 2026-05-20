package com.scribespeak.app.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.scribespeak.app.ui.components.SectionCard

@Composable
fun HomeRoute(
    onImportClick: () -> Unit,
    onHistoryClick: () -> Unit,
    viewModel: HomeViewModel,
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            SectionCard(
                title = "Read the web and PDFs aloud",
                subtitle = "Import article URLs, open PDFs, and keep extracted text cached for offline listening.",
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Button(onClick = onImportClick, modifier = Modifier.weight(1f)) {
                        Text("Import")
                    }
                    Button(onClick = onHistoryClick, modifier = Modifier.weight(1f)) {
                        Text("History")
                    }
                }
            }
        }

        item {
            Text(
                text = "Recent Items",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(horizontal = 4.dp),
            )
        }

        if (uiState.recentItems.isEmpty()) {
            item {
                SectionCard(
                    title = "No cached content yet",
                    subtitle = "Imported articles and PDFs will appear here after extraction is wired up.",
                )
            }
        } else {
            items(uiState.recentItems, key = { it.id }) { item ->
                SectionCard(
                    title = item.title,
                    subtitle = item.originalSource,
                )
            }
        }
    }
}
