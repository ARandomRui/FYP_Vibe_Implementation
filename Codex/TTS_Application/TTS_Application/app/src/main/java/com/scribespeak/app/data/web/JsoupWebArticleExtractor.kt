package com.scribespeak.app.data.web

import com.scribespeak.app.domain.extract.WebArticleExtractor
import com.scribespeak.app.domain.extract.WebArticleResult
import com.scribespeak.app.domain.util.normalizeUrl
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import org.jsoup.nodes.Element

@Singleton
class JsoupWebArticleExtractor @Inject constructor(
    private val okHttpClient: OkHttpClient
) : WebArticleExtractor {
    private val minimumArticleLength = 180

    override suspend fun extract(url: String): WebArticleResult {
        return withContext(Dispatchers.IO) {
            extractFromUrl(normalizeUrl(url))
        }
    }

    internal fun parseDocument(document: Document, normalizedUrl: String): WebArticleResult {
        val structuredArticle = extractStructuredArticle(document)
        sanitize(document)

        val articleRoot = selectBestRoot(document)
        val structuredText = structuredArticle.articleBody
            ?.let(::normalizeText)
            ?.takeIf { it.length >= minimumArticleLength }
        val readableText = extractReadableText(articleRoot ?: document.body())
        val extractedText = chooseBestExtractedText(
            structuredText = structuredText,
            readableText = readableText
        )

        if (extractedText.length < minimumArticleLength) {
            throw IllegalStateException(
                if (looksPaywalled(document, extractedText)) {
                    "That page appears to hide the full article behind a paywall or app-only gate."
                } else {
                    "Couldn't find enough readable article text on that page."
                }
            )
        }

        val title = structuredArticle.title
            ?.takeIf { it.isNotBlank() }
            ?: resolveTitle(document, normalizedUrl)
        val languageCode = structuredArticle.languageCode
            ?.substringBefore('-')
            ?.takeIf { it.isNotBlank() }
            ?: document.selectFirst("html")?.attr("lang")
                ?.substringBefore('-')
                ?.takeIf { it.isNotBlank() }

        return WebArticleResult(
            normalizedUrl = normalizedUrl,
            title = title,
            extractedText = extractedText,
            languageCode = languageCode
        )
    }

    private fun chooseBestExtractedText(
        structuredText: String?,
        readableText: String
    ): String {
        val structuredCandidate = structuredText?.trim().orEmpty()
        val readableCandidate = readableText.trim()
        val hasReadableCandidate = readableCandidate.length >= minimumArticleLength
        val hasStructuredCandidate = structuredCandidate.length >= minimumArticleLength

        if (!hasReadableCandidate) {
            return structuredCandidate.ifBlank { readableCandidate }
        }

        if (!hasStructuredCandidate) {
            return readableCandidate
        }

        val readableParagraphScore = paragraphScore(readableCandidate)
        val structuredParagraphScore = paragraphScore(structuredCandidate)

        return when {
            readableParagraphScore > structuredParagraphScore -> readableCandidate
            structuredParagraphScore >= 3 && structuredCandidate.length > readableCandidate.length * 1.35 -> {
                structuredCandidate
            }

            else -> readableCandidate
        }
    }

    private fun extractFromUrl(
        normalizedUrl: String,
        allowAmpFallback: Boolean = true
    ): WebArticleResult {
        val document = fetchDocument(normalizedUrl)
        val initialResult = runCatching {
            parseDocument(document.clone(), normalizedUrl)
        }

        val ampUrl = document.selectFirst("link[rel=amphtml]")?.attr("href")
            ?.takeIf { it.isNotBlank() }
            ?.let(::normalizeUrl)
            ?.takeIf { it != normalizedUrl }

        if (
            allowAmpFallback &&
            ampUrl != null &&
            shouldTryAmpFallback(document, initialResult.getOrNull(), initialResult.exceptionOrNull())
        ) {
            runCatching {
                val ampResult = parseDocument(fetchDocument(ampUrl), normalizedUrl)
                if (ampResult.extractedText.length > (initialResult.getOrNull()?.extractedText?.length ?: 0)) {
                    return ampResult
                }
            }
        }

        return initialResult.getOrElse { throw it }
    }

    private fun fetchDocument(url: String): Document {
        val request = Request.Builder()
            .url(url)
            .header(
                "User-Agent",
                "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 " +
                    "(KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36"
            )
            .build()

        val response = okHttpClient.newCall(request).execute()
        if (!response.isSuccessful) {
            response.close()
            throw IllegalStateException("Request failed with HTTP ${response.code}")
        }

        val html = response.body?.string().orEmpty()
        response.close()

        if (html.isBlank()) {
            throw IllegalStateException("The page returned empty content.")
        }

        return Jsoup.parse(html, url)
    }

    private fun shouldTryAmpFallback(
        document: Document,
        result: WebArticleResult?,
        error: Throwable?
    ): Boolean {
        if (error != null) {
            return true
        }

        val extractedText = result?.extractedText.orEmpty()
        if (extractedText.length < minimumArticleLength) {
            return true
        }

        val pageText = normalizeText(document.text())
        return pageText.anyContains(
            listOf(
                "analysis",
                "listen to this article",
                "watch:",
                "video duration"
            )
        ) && extractedText.length < 500
    }

    private fun sanitize(document: Document) {
        document.select(
            "script:not([type=application/ld+json]), style, nav, footer, header, " +
                "noscript, form, iframe, svg, button, input, picture, source, video, audio, canvas"
        ).remove()

        document.select("*").toList().forEach { element ->
            if (shouldPruneElement(element)) {
                element.remove()
            }
        }
    }

    private fun selectBestRoot(document: Document): Element? {
        val primarySelectors = listOf(
            "[itemprop=articleBody]",
            "[data-article-body]",
            "[data-module*=article]",
            ".article-body",
            ".article__body",
            ".article-content",
            ".article__content",
            ".story-body",
            ".story-content",
            ".entry-content",
            ".post-content",
            ".node__content",
            ".wysiwyg",
            "article .content",
            "article .body",
            "main article",
            "article"
        )

        primarySelectors.forEach { selector ->
            document.select(selector)
                .firstOrNull { candidate -> isValidContentRoot(candidate) }
                ?.let { return it }
        }

        val candidates = document.select("article, main, [role=main], section, div")
            .distinct()

        return candidates.maxByOrNull(::scoreContentRoot)
            ?.takeIf(::isValidContentRoot)
    }

    private fun extractReadableText(root: Element?): String {
        if (root == null) return ""

        val workingRoot = root.clone()
        workingRoot.select("*").toList().forEach { element ->
            if (shouldPruneElement(element)) {
                element.remove()
            }
        }

        val blocks = mutableListOf<String>()
        val seen = linkedSetOf<String>()

        for (element in workingRoot.select("h2, h3, h4, p, li, blockquote, pre")) {
            if (shouldSkipTextElement(element)) continue

            val text = normalizeText(element.text())
            if (text.isBlank()) continue

            if (isTerminalSectionHeading(text, element)) {
                break
            }

            if (isSkippableStandaloneText(text, element)) continue

            val minimumLength = if (element.tagName().startsWith("h")) 12 else 28
            if (text.length < minimumLength) continue

            if (seen.add(text)) {
                blocks += text
            }
        }

        if (blocks.isNotEmpty()) {
            return blocks.joinToString(separator = "\n\n")
        }

        return normalizeText(workingRoot.text())
            .split(Regex("(?<=[.!?\\u3002\\uFF01\\uFF1F])\\s+"))
            .map(::normalizeText)
            .filter { it.length >= 30 }
            .distinct()
            .joinToString(separator = "\n\n")
    }

    private fun resolveTitle(document: Document, normalizedUrl: String): String {
        val metaTitle = document.selectFirst("meta[property=og:title]")?.attr("content")
        val title = metaTitle?.takeIf { it.isNotBlank() }
            ?: document.title().takeIf { it.isNotBlank() }
            ?: normalizedUrl

        return title.trim()
    }

    private fun extractStructuredArticle(document: Document): StructuredArticle {
        val articleNodes = mutableListOf<JSONObject>()

        document.select("script[type=application/ld+json]").forEach { script ->
            val json = script.data().trim()
            if (json.isBlank()) return@forEach

            runCatching {
                collectStructuredArticleNodes(json, articleNodes)
            }
        }

        val bestNode = articleNodes.maxByOrNull { node ->
            node.optString("articleBody").length * 3 +
                node.optString("description").length +
                node.optString("headline").length
        }

        return StructuredArticle(
            title = bestNode?.optString("headline")?.takeIf { it.isNotBlank() },
            articleBody = bestNode?.optString("articleBody")?.takeIf { it.isNotBlank() }
                ?: bestNode?.optString("description")?.takeIf { it.length >= 180 },
            languageCode = bestNode?.optString("inLanguage")?.takeIf { it.isNotBlank() }
        )
    }

    private fun collectStructuredArticleNodes(json: String, sink: MutableList<JSONObject>) {
        val trimmed = json.trim()
        when {
            trimmed.startsWith("[") -> collectStructuredArticleNodes(JSONArray(trimmed), sink)
            trimmed.startsWith("{") -> collectStructuredArticleNodes(JSONObject(trimmed), sink)
        }
    }

    private fun collectStructuredArticleNodes(array: JSONArray, sink: MutableList<JSONObject>) {
        for (index in 0 until array.length()) {
            when (val item = array.opt(index)) {
                is JSONObject -> collectStructuredArticleNodes(item, sink)
                is JSONArray -> collectStructuredArticleNodes(item, sink)
            }
        }
    }

    private fun collectStructuredArticleNodes(node: JSONObject, sink: MutableList<JSONObject>) {
        if (node.isLikelyArticleNode()) {
            sink += node
        }

        node.optJSONArray("@graph")?.let { collectStructuredArticleNodes(it, sink) }
        node.optJSONObject("mainEntity")?.let { collectStructuredArticleNodes(it, sink) }
        node.optJSONObject("mainEntityOfPage")?.let { collectStructuredArticleNodes(it, sink) }
    }

    private fun JSONObject.isLikelyArticleNode(): Boolean {
        val typeValue = opt("@type")
        val types = when (typeValue) {
            is JSONArray -> buildList {
                for (index in 0 until typeValue.length()) {
                    add(typeValue.optString(index))
                }
            }

            else -> listOf(optString("@type"))
        }.map { it.lowercase() }

        return types.any { type ->
            type.contains("article") || type.contains("newsarticle") || type.contains("report")
        }
    }

    private fun isValidContentRoot(element: Element): Boolean {
        if (shouldPruneElement(element)) return false
        if (element.text().length < 180) return false
        return scoreContentRoot(element) >= 280
    }

    private fun scoreContentRoot(element: Element): Int {
        val paragraphCount = element.select("p").size
        val paragraphTextLength = element.select("p").sumOf { it.text().length }
        val articleHint = if (hasArticleHint(element)) 250 else 0
        val bodyHint = if (hasBodyHint(element)) 180 else 0
        val junkPenalty = if (hasJunkHint(element)) 500 else 0

        return paragraphTextLength + (paragraphCount * 120) + articleHint + bodyHint - junkPenalty
    }

    private fun shouldPruneElement(element: Element): Boolean {
        val ownText = normalizeText(element.ownText())
        val combinedHints = buildString {
            append(element.tagName())
            append(' ')
            append(element.id())
            append(' ')
            append(element.className())
            append(' ')
            append(element.attr("role"))
            append(' ')
            append(element.attr("aria-label"))
            append(' ')
            append(element.attr("data-testid"))
            append(' ')
            append(element.attr("data-module"))
        }.lowercase()

        if (combinedHints.contains("article-body") || combinedHints.contains("article__body")) {
            return false
        }

        if (combinedHints.anyContains(PRUNE_KEYWORDS)) {
            return true
        }

        if (
            element.tagName() !in setOf("article", "main", "body") &&
            element.select("h1, h2, h3, h4, h5").any { heading ->
                isStandaloneJunkHeading(normalizeText(heading.text()))
            }
        ) {
            return true
        }

        if (hasAdLikeHint(combinedHints) && !hasArticleHint(element)) {
            return true
        }

        return isStandaloneJunkHeading(ownText)
    }

    private fun shouldSkipTextElement(element: Element): Boolean {
        val text = normalizeText(element.text())
        if (text.isBlank()) return true
        if (element.parents().any(::shouldPruneElement)) return true
        if (text.anyContains(SKIP_TEXT_PATTERNS)) return true
        return false
    }

    private fun isSkippableStandaloneText(text: String, element: Element): Boolean {
        if (text.anyContains(SKIP_TEXT_PATTERNS)) return true
        if (element.tagName() == "li" && text.length < 45) return true
        return false
    }

    private fun isTerminalSectionHeading(text: String, element: Element): Boolean {
        if (!element.tagName().startsWith("h")) return false

        val normalized = text.lowercase()
        return TERMINAL_SECTION_HEADINGS.any { marker ->
            normalized == marker || normalized.startsWith("$marker:")
        }
    }

    private fun isStandaloneJunkHeading(text: String): Boolean {
        if (text.isBlank()) return false
        val normalized = text.lowercase()
        return STANDALONE_JUNK_HEADINGS.any { marker ->
            normalized == marker || normalized.startsWith("$marker:")
        }
    }

    private fun looksPaywalled(document: Document, extractedText: String): Boolean {
        val pageText = normalizeText(document.text())
        if (extractedText.length >= minimumArticleLength) return false

        return pageText.anyContains(
            listOf(
                "unlocking article",
                "subscribe to continue",
                "subscriber only",
                "sign in to read",
                "login to continue",
                "members only"
            )
        ) || document.select("meta[name=mk:free][content=false]").isNotEmpty() ||
            document.select("script[type=application/ld+json]")
                .any { it.data().contains("\"isAccessibleForFree\":\"False\"", ignoreCase = true) }
    }

    private fun hasArticleHint(element: Element): Boolean {
        val hints = "${element.id()} ${element.className()} ${element.attr("itemprop")}".lowercase()
        return hints.anyContains(listOf("article", "story", "entry", "post", "content"))
    }

    private fun hasBodyHint(element: Element): Boolean {
        val hints = "${element.id()} ${element.className()} ${element.attr("itemprop")}".lowercase()
        return hints.anyContains(listOf("body", "main", "text", "copy", "content"))
    }

    private fun hasJunkHint(element: Element): Boolean {
        val hints = "${element.id()} ${element.className()}".lowercase()
        return hints.anyContains(PRUNE_KEYWORDS)
    }

    private fun hasAdLikeHint(text: String): Boolean {
        return Regex("(^|[^a-z])(ad|ads|advert|adslot)([^a-z]|$)").containsMatchIn(text)
    }

    private fun normalizeText(text: String): String {
        return text
            .replace('\u00A0', ' ')
            .replace(Regex("[\\t\\x0B\\f\\r ]+"), " ")
            .replace(Regex("\\n{3,}"), "\n\n")
            .lines()
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .joinToString("\n")
            .trim()
    }

    private fun paragraphScore(text: String): Int {
        if (text.isBlank()) return 0

        val explicitParagraphs = text.split(Regex("\\n\\s*\\n"))
            .map(String::trim)
            .count { it.length >= 40 }
        val singleLineParagraphs = text.lines()
            .map(String::trim)
            .count { it.length >= 40 }

        return maxOf(explicitParagraphs, singleLineParagraphs)
    }

    private fun String.anyContains(values: List<String>): Boolean {
        return values.any { value -> contains(value, ignoreCase = true) }
    }

    private data class StructuredArticle(
        val title: String? = null,
        val articleBody: String? = null,
        val languageCode: String? = null
    )

    private companion object {
        val PRUNE_KEYWORDS = listOf(
            "recommend",
            "related",
            "most-read",
            "mostread",
            "most-commented",
            "popular",
            "trending",
            "share",
            "social",
            "newsletter",
            "subscribe",
            "comment",
            "cookie",
            "consent",
            "breadcrumb",
            "promo",
            "advert",
            "ad-container",
            "adslot",
            "taboola",
            "outbrain",
            "next-post",
            "read-more",
            "more-like-this",
            "tag-list",
            "topics",
            "paywall",
            "locked",
            "unlocking",
            "audio-broadcast",
            "call-to-action"
        )

        val SKIP_TEXT_PATTERNS = listOf(
            "recommended stories",
            "related reports",
            "read more like this",
            "view comments",
            "unlocking article",
            "help us get the word out",
            "audio broadcast",
            "call to action",
            "please join the",
            "advertisement",
            "ads"
        )

        val TERMINAL_SECTION_HEADINGS = listOf(
            "tags",
            "help us get the word out",
            "audio broadcast",
            "call to action",
            "related reports",
            "next post"
        )

        val STANDALONE_JUNK_HEADINGS = listOf(
            "recommended stories",
            "related reports",
            "read more like this",
            "view comments",
            "audio broadcast",
            "call to action",
            "unlocking article",
            "advertisement"
        )
    }
}
