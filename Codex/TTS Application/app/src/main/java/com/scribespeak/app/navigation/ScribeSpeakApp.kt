package com.scribespeak.app.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.ImportContacts
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.VolumeUp
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.scribespeak.app.AppContainer
import com.scribespeak.app.ui.screens.history.HistoryRoute
import com.scribespeak.app.ui.screens.home.HomeRoute
import com.scribespeak.app.ui.screens.importer.ImportRoute
import com.scribespeak.app.ui.screens.reader.ReaderRoute
import com.scribespeak.app.ui.screens.settings.SettingsRoute
import com.scribespeak.app.ui.screens.shared.AppViewModelFactory

@Composable
fun ScribeSpeakApp(
    appContainer: AppContainer,
    initialSharedText: String?,
) {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val factory = AppViewModelFactory(appContainer)
    val items = listOf(
        NavItem(Destination.Home.route, "Home", Icons.Outlined.Home),
        NavItem(Destination.Import.route, "Import", Icons.Outlined.ImportContacts),
        NavItem(Destination.Reader.route, "Reader", Icons.Outlined.VolumeUp),
        NavItem(Destination.History.route, "History", Icons.Outlined.History),
        NavItem(Destination.Settings.route, "Settings", Icons.Outlined.Settings),
    )

    LaunchedEffect(initialSharedText) {
        if (!initialSharedText.isNullOrBlank()) {
            navController.navigate(Destination.Import.route)
        }
    }

    Scaffold(
        bottomBar = {
            NavigationBar {
                items.forEach { item ->
                    NavigationBarItem(
                        selected = currentRoute == item.route,
                        onClick = {
                            navController.navigate(item.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(item.icon, contentDescription = item.label) },
                        label = { Text(item.label) },
                    )
                }
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Destination.Home.route,
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(Destination.Home.route) {
                HomeRoute(
                    onImportClick = { navController.navigate(Destination.Import.route) },
                    onHistoryClick = { navController.navigate(Destination.History.route) },
                    viewModel = viewModel(factory = factory),
                )
            }
            composable(Destination.Import.route) {
                ImportRoute(
                    sharedText = initialSharedText,
                    viewModel = viewModel(factory = factory),
                )
            }
            composable(Destination.Reader.route) {
                ReaderRoute(appContainer = appContainer)
            }
            composable(Destination.History.route) {
                HistoryRoute(onOpenReader = { navController.navigate(Destination.Reader.route) })
            }
            composable(Destination.Settings.route) {
                SettingsRoute(appContainer = appContainer)
            }
        }
    }
}
