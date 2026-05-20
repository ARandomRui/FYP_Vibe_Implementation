package com.scribespeak.app.ui.screens.history

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.scribespeak.app.ui.components.SectionCard

@Composable
fun HistoryRoute(
    onOpenReader: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        SectionCard(
            title = "History and Library",
            subtitle = "This screen will hold cached URLs, extracted PDFs, offline reopen behavior, and future search/filter actions.",
        )
        Button(onClick = onOpenReader) {
            Text("Open Reader")
        }
    }
}
