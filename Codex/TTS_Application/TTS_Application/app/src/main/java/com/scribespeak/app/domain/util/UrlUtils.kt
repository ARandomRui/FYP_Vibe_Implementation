package com.scribespeak.app.domain.util

import java.net.URI
import java.net.URISyntaxException

fun String.findFirstUrl(): String? {
    val candidate = Regex("""https?://[^\s<>"']+""")
        .find(this)
        ?.value

    return candidate ?: takeIf { it.contains('.') && !it.contains(' ') }
}

fun normalizeUrl(rawUrl: String): String {
    val trimmed = rawUrl.trim()
    require(trimmed.isNotBlank()) { "Enter a URL first." }

    val withScheme = if (trimmed.startsWith("http://", ignoreCase = true) ||
        trimmed.startsWith("https://", ignoreCase = true)
    ) {
        trimmed
    } else {
        "https://$trimmed"
    }

    return try {
        val uri = URI(withScheme)
        val scheme = uri.scheme?.lowercase()
        require(scheme == "http" || scheme == "https") { "Only HTTP and HTTPS URLs are supported." }
        require(!uri.host.isNullOrBlank()) { "That URL is missing a valid host name." }

        val normalizedUri = URI(
            scheme,
            uri.userInfo,
            uri.host.lowercase(),
            uri.port,
            uri.path?.ifBlank { "/" },
            uri.query,
            null
        )

        normalizedUri.toString()
    } catch (_: URISyntaxException) {
        throw IllegalArgumentException("That doesn't look like a valid URL.")
    }
}
