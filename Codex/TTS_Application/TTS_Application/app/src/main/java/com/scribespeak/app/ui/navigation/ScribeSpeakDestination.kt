package com.scribespeak.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoStories
import androidx.compose.material.icons.outlined.CloudDownload
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.ui.graphics.vector.ImageVector

sealed class ScribeSpeakDestination(
    val route: String,
    val label: String,
    val icon: ImageVector?,
    val showInBottomBar: Boolean
) {
    data object Home : ScribeSpeakDestination(
        route = "home",
        label = "Home",
        icon = Icons.Outlined.Home,
        showInBottomBar = true
    )

    data object Import : ScribeSpeakDestination(
        route = "import",
        label = "Import",
        icon = Icons.Outlined.CloudDownload,
        showInBottomBar = true
    )

    data object Reader : ScribeSpeakDestination(
        route = "reader/{contentId}",
        label = "Reader",
        icon = Icons.Outlined.AutoStories,
        showInBottomBar = false
    ) {
        fun createRoute(contentId: Long): String = "reader/$contentId"
    }

    data object History : ScribeSpeakDestination(
        route = "history",
        label = "Library",
        icon = Icons.Outlined.History,
        showInBottomBar = true
    )

    data object Settings : ScribeSpeakDestination(
        route = "settings",
        label = "Settings",
        icon = Icons.Outlined.Settings,
        showInBottomBar = true
    )

    companion object {
        val bottomBarItems = listOf(Home, Import, History, Settings)
    }
}
