package com.scribespeak.app.ui.screens.reader

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.scribespeak.app.AppContainer
import com.scribespeak.app.ui.components.SectionCard

@Composable
fun ReaderRoute(
    appContainer: AppContainer,
) {
    val sampleText = "ScribeSpeak will read extracted content one paragraph at a time. This sample proves the playback controls are in place.\n\nUse start, stop, resume, and next paragraph while we wire up live article and PDF content."

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            SectionCard(
                title = "Reader",
                subtitle = "Paragraph-based playback controls are now scaffolded. The next pass will connect them to imported content and persisted reading position.",
            )
        }
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Button(
                    onClick = { appContainer.ttsController.play(sampleText) },
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Start")
                }
                Button(
                    onClick = { appContainer.ttsController.stop() },
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Stop")
                }
            }
        }
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Button(
                    onClick = { appContainer.ttsController.resume() },
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Resume")
                }
                Button(
                    onClick = { appContainer.ttsController.jumpForwardParagraph() },
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Next Paragraph")
                }
            }
        }
        item {
            SectionCard(
                title = "Playback sample",
                subtitle = sampleText,
            )
        }
    }
}
