package com.scribespeak.app.navigation

sealed class Destination(val route: String) {
    data object Home : Destination("home")
    data object Import : Destination("import")
    data object Reader : Destination("reader")
    data object History : Destination("history")
    data object Settings : Destination("settings")
}
