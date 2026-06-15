package com.scribespeak.app.data.web

import okhttp3.OkHttpClient
import org.jsoup.Jsoup
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class JsoupWebArticleExtractorTest {
    private val extractor = JsoupWebArticleExtractor(OkHttpClient())

    @Test
    fun `structured article body is preferred over noisy page chrome`() {
        val html = """
            <html lang="en">
            <head>
                <title>Fallback title</title>
                <script type="application/ld+json">
                {
                  "@context": "https://schema.org",
                  "@type": "NewsArticle",
                  "headline": "Structured title",
                  "inLanguage": "en-US",
                  "articleBody": "First real paragraph with enough words to be meaningful and clearly part of the article.\n\nSecond real paragraph continues the story without any recommendation widgets or tags attached."
                }
                </script>
            </head>
            <body>
                <div class="recommended">Recommended Stories</div>
                <article>
                    <p>Noise that should not win because structured data is better.</p>
                </article>
            </body>
            </html>
        """.trimIndent()

        val result = extractor.parseDocument(Jsoup.parse(html, "https://example.com/story"), "https://example.com/story")

        assertEquals("Structured title", result.title)
        assertEquals("en", result.languageCode)
        assertTrue(result.extractedText.startsWith("First real paragraph"))
        assertFalse(result.extractedText.contains("Recommended Stories"))
    }

    @Test
    fun `recommended stories and ads are removed from article body`() {
        val html = """
            <html lang="en">
            <body>
                <article class="article-body">
                    <h1>Headline</h1>
                    <p>This opening paragraph contains enough text to count as the real beginning of the article and should be preserved fully.</p>
                    <div class="recommended">
                        <h2>Recommended Stories</h2>
                        <p>This should never appear in the extracted output because it is not part of the main article.</p>
                    </div>
                    <p>This follow-up paragraph continues the reporting and should still appear after the recommendation block is stripped out.</p>
                    <div class="advertisement">Advertisement</div>
                    <p>This closing paragraph is also real article text and should remain available to the reader.</p>
                </article>
            </body>
            </html>
        """.trimIndent()

        val result = extractor.parseDocument(Jsoup.parse(html, "https://example.com/article"), "https://example.com/article")

        assertTrue(result.extractedText.contains("opening paragraph"))
        assertTrue(result.extractedText.contains("follow-up paragraph"))
        assertTrue(result.extractedText.contains("closing paragraph"))
        assertFalse(result.extractedText.contains("Recommended Stories"))
        assertFalse(result.extractedText.contains("Advertisement"))
        assertFalse(result.extractedText.contains("never appear"))
    }

    @Test
    fun `tags and call to action sections are excluded`() {
        val html = """
            <html lang="en">
            <body>
                <article class="post-content">
                    <h1>Ministry leader urges caution as Christians turn to AI for guidance</h1>
                    <p>USA (MNN) — This first paragraph is part of the story and contains enough substance to represent the article body properly for extraction.</p>
                    <p>The second paragraph adds more reporting detail, context, and quoted material so the test resembles a realistic article structure.</p>
                    <h4>Tags:</h4>
                    <p>AI artificial intelligence barna research</p>
                    <h3>Help us get the word out:</h3>
                    <p>Share Tweet Share</p>
                    <h3>Audio Broadcast</h3>
                    <p>Download 1min 2min 4-5min</p>
                </article>
            </body>
            </html>
        """.trimIndent()

        val result = extractor.parseDocument(Jsoup.parse(html, "https://example.com/mnn"), "https://example.com/mnn")

        assertTrue(result.extractedText.contains("first paragraph"))
        assertTrue(result.extractedText.contains("second paragraph"))
        assertFalse(result.extractedText.contains("Tags:"))
        assertFalse(result.extractedText.contains("Help us get the word out"))
        assertFalse(result.extractedText.contains("Audio Broadcast"))
    }

    @Test
    fun `paywall scaffolding returns a clearer error`() {
        val html = """
            <html lang="en">
            <body>
                <main>
                    <article>
                        <h1>Locked story</h1>
                        <p>This brief summary teases the story but is not enough to represent a full article for the reader.</p>
                        <div>Unlocking Article</div>
                        <div>Please subscribe to continue reading.</div>
                    </article>
                </main>
            </body>
            </html>
        """.trimIndent()

        val error = runCatching {
            extractor.parseDocument(Jsoup.parse(html, "https://example.com/locked"), "https://example.com/locked")
        }.exceptionOrNull()

        assertEquals(
            "That page appears to hide the full article behind a paywall or app-only gate.",
            error?.message
        )
    }
}
