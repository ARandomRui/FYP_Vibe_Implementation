package com.example.antigravitytts

import net.dankito.readability4j.Readability4J
import org.jsoup.Jsoup
import org.jsoup.nodes.Document

object SmartScraper {

    // 1. Primary Method: Try Jsoup HTTP Request
    fun scrapeUrl(url: String): String? {
        return try {
            val doc = Jsoup.connect(url)
                // STEALTH HEADERS to bypass 403s
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
                .header("Accept-Language", "en-US,en;q=0.9")
                .timeout(10000)
                .get()

            processDocument(doc, url)
        } catch (e: Exception) {
            // If Jsoup fails (403 Forbidden, 503, Timeout), return NULL to trigger WebView fallback
            e.printStackTrace()
            null 
        }
    }

    // 2. Secondary Method: Process Raw HTML (from WebView)
    // Call this if scrapeUrl() returns null.
    fun processHtmlFromWebView(html: String, url: String): String {
        val doc = Jsoup.parse(html)
        return processDocument(doc, url)
    }

    // 3. The Core Processing Pipeline
    private fun processDocument(doc: Document, url: String): String {
        // A. Remove Noise (Scripts, styles, Nav)
        doc.select("script, style, nav, footer, header, aside, iframe, object, embed").remove()
        
        // B. Remove Advertisement & Widget Classes
        doc.select(".ad, .advertisement, .social-share, .cookie-banner, .pop-up, .newsletter-signup").remove()
        // Removed .module as it's too aggressive and often used for main content wrappers
        doc.select(".read-more, .related-stories, .recommended, .most-popular, .trending, .widget").remove() 
        doc.select("[class*='related'], [class*='recommend'], [class*='widget'], [id*='related'], [id*='recommend']").remove()

        // C. Specific Site Fixes (e.g., Al Jazeera) & Accessibility Text
        doc.select(".article-featured-list, .featured-list, .more-on-aljazeera").remove()
        doc.select(".sr-only, .visually-hidden, .screen-reader-text").remove()

        // D. Text-Based Header Removal ("Recommended Stories")
        removeHeadersWithText(doc, "Recommended Stories")
        removeHeadersWithText(doc, "Related Stories")
        removeHeadersWithText(doc, "Most Read")
        removeHeadersWithText(doc, "Trending")
        removeHeadersWithText(doc, "Latest News")
        removeHeadersWithText(doc, "Editors' Picks")
        
        // Japanese Specific Headers
        removeHeadersWithText(doc, "おすすめ") // Recommended
        removeHeadersWithText(doc, "関連") // Related
        removeHeadersWithText(doc, "ランキング") // Ranking
        removeHeadersWithText(doc, "よく読まれている") // Most Read
        removeHeadersWithText(doc, "新着") // New Arrivals
        removeHeadersWithText(doc, "注目") // Featured/Attention
        
        // Specific Layout Fixes for Japanese Sites
        doc.select(".access-ranking, .side-widget, .recommend-box, .related-box, .ranking-box").remove()

        // E. Link Density Analysis (The "Nuclear Option")
        // Removes blocks that are mostly links (>50% link text)
        removeHighLinkDensityNodes(doc)

        // F. Final Clean: Empty tags
        for (element in doc.select("p, div, span, li")) {
            if (element.text().trim().isEmpty()) element.remove()
        }

        // G. Pass cleaned HTML to Readability4J
        val readabilityService = Readability4J(url, doc.html())
        val article = readabilityService.parse()

        return article.textContent ?: "Failed to extract content."
    }

    // --- Helper Functions ---

    private fun removeHeadersWithText(doc: Document, text: String) {
        // Only target actual headers or very short elements to avoid deleting main content containers
        val headers = doc.select("h1, h2, h3, h4, h5, h6, strong, b, em, span, div, p")
        for (header in headers) {
            val headerText = header.text().trim()
            
            // Safety check: specific tags like DIV/P/SPAN must be short to be considered a "header"
            // If it's a long paragraph or container, it just *contains* the text, it isn't a header.
            val isGenericTag = header.tagName() in listOf("div", "span", "p")
            if (isGenericTag && headerText.length > 100) continue

            if (headerText.contains(text, ignoreCase = true)) {
                header.remove()
                // Also remove the next sibling if it's likely the list for that header
                val next = header.nextElementSibling()
                if (next != null && (next.tagName() == "ul" || next.tagName() == "div")) {
                    next.remove()
                }
            }
        }
    }

    private fun removeHighLinkDensityNodes(doc: Document) {
        val candidates = doc.select("p, ul, ol, div, section, article") 
        for (node in candidates) {
            val totalText = node.text().trim()
            if (totalText.length < 50) continue // Too short to matter for this check
            
            // Safety Check: Don't remove nodes that look like main content
            val id = node.id().lowercase()
            val className = node.className().lowercase()
            val isLikelyContent = (id.contains("content") || id.contains("article") || id.contains("body") || id.contains("story") || id.contains("main") ||
                                   className.contains("content") || className.contains("article") || className.contains("body") || className.contains("story") || className.contains("main"))
            
            // If it's explicitly marked as content, skip density check unless it's obviously a list
            if (isLikelyContent && !node.tagName().equals("ul") && !node.tagName().equals("ol")) continue

            val links = node.select("a")
            if (links.isEmpty()) continue

            val linkTextLength = links.sumOf { it.text().length }
            val density = linkTextLength.toDouble() / totalText.length.toDouble()

            // If > 50% links, it's likely navigation noise
            if (density > 0.5) {
                // Be careful not to delete huge containers (likely the main wrapper)
                // BUT if it's NOT marked as content, use a safer threshold (500 chars)
                if (totalText.length < 500 && !isLikelyContent) {
                    node.remove()
                }
            }
        }
    }
}
