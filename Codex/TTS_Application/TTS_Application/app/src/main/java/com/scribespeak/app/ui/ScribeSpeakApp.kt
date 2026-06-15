package com.scribespeak.app.ui

import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.scribespeak.app.ui.navigation.ScribeSpeakDestination
import com.scribespeak.app.ui.navigation.ScribeSpeakNavHost

@Composable
fun ScribeSpeakApp(
    sharedUrl: String?,
    onSharedUrlConsumed: () -> Unit
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    LaunchedEffect(sharedUrl) {
        if (!sharedUrl.isNullOrBlank()) {
            navController.navigate(ScribeSpeakDestination.Import.route) {
                launchSingleTop = true
            }
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            NavigationBar {
                ScribeSpeakDestination.bottomBarItems.forEach { destination ->
                    val selected = currentDestination?.hierarchy?.any {
                        it.route == destination.route
                    } == true

                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            when (destination) {
                                ScribeSpeakDestination.Home -> {
                                    val popped = navController.popBackStack(
                                        route = ScribeSpeakDestination.Home.route,
                                        inclusive = false
                                    )
                                    if (!popped) {
                                        navController.navigate(ScribeSpeakDestination.Home.route) {
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    }
                                }

                                else -> {
                                    navController.navigate(destination.route) {
                                        launchSingleTop = true
                                        restoreState = true
                                        popUpTo(ScribeSpeakDestination.Home.route) {
                                            saveState = true
                                        }
                                    }
                                }
                            }
                        },
                        icon = {
                            destination.icon?.let { icon ->
                                androidx.compose.material3.Icon(
                                    imageVector = icon,
                                    contentDescription = destination.label
                                )
                            }
                        },
                        label = { Text(destination.label) }
                    )
                }
            }
        }
    ) { innerPadding ->
        ScribeSpeakNavHost(
            navController = navController,
            sharedUrl = sharedUrl,
            onSharedUrlConsumed = onSharedUrlConsumed,
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .consumeWindowInsets(innerPadding)
        )
    }
}
