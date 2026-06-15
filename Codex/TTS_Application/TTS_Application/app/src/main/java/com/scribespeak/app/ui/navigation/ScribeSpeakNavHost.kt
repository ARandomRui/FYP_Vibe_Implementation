package com.scribespeak.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.NavHostController
import androidx.navigation.navArgument
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.scribespeak.app.ui.screens.history.HistoryRoute
import com.scribespeak.app.ui.screens.home.HomeRoute
import com.scribespeak.app.ui.screens.importer.ImportRoute
import com.scribespeak.app.ui.screens.reader.ReaderRoute
import com.scribespeak.app.ui.screens.settings.SettingsRoute

@Composable
fun ScribeSpeakNavHost(
    navController: NavHostController,
    sharedUrl: String?,
    onSharedUrlConsumed: () -> Unit,
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = ScribeSpeakDestination.Home.route,
        modifier = modifier
    ) {
        composable(ScribeSpeakDestination.Home.route) {
            HomeRoute(
                onImportClick = {
                    navController.navigate(ScribeSpeakDestination.Import.route)
                },
                onHistoryClick = {
                    navController.navigate(ScribeSpeakDestination.History.route)
                },
                onRecentItemClick = { contentId ->
                    navController.navigate(ScribeSpeakDestination.Reader.createRoute(contentId))
                }
            )
        }
        composable(ScribeSpeakDestination.Import.route) {
            ImportRoute(
                sharedUrl = sharedUrl,
                onSharedUrlConsumed = onSharedUrlConsumed,
                onOpenReader = { contentId ->
                    navController.navigate(ScribeSpeakDestination.Reader.createRoute(contentId))
                }
            )
        }
        composable(
            route = ScribeSpeakDestination.Reader.route,
            arguments = listOf(
                navArgument("contentId") {
                    type = NavType.LongType
                }
            )
        ) {
            ReaderRoute(
                onGoBack = { navController.popBackStack() }
            )
        }
        composable(ScribeSpeakDestination.History.route) {
            HistoryRoute(
                onOpenReader = { contentId ->
                    navController.navigate(ScribeSpeakDestination.Reader.createRoute(contentId))
                }
            )
        }
        composable(ScribeSpeakDestination.Settings.route) {
            SettingsRoute()
        }
    }
}
