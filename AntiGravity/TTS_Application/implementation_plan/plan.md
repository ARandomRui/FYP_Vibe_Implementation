# Comprehensive Web Scraper Strategy (Hybrid Jsoup + WebView Fallback)

## 1. Core Dependencies (build.gradle.kts)
You must include these in your `app/build.gradle.kts`:
```kotlin
dependencies {
    // For HTML Parsing & Http Requests
    implementation("org.jsoup:jsoup:1.17.2")
    
    // For Smart Content Extraction (Mozilla's Readability port)
    implementation("net.dankito.readability4j:readability4j:1.0.8")
    
    // Coroutines for background threading
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
}
```

---

## 2. The Extraction Logic (Kotlin Class)
This class encapsulates the entire "Smart Scraping" strategy. It attempts a fast Jsoup fetch first, and includes the cleaning logic we developed (Link Density, Al Jazeera fixes, etc.).

```kotlin
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
        doc.select(".read-more, .related-stories, .recommended, .most-popular, .trending, .widget, .module").remove()
        doc.select("[class*='related'], [class*='recommend'], [class*='widget'], [id*='related'], [id*='recommend']").remove()

        // C. Specific Site Fixes (e.g., Al Jazeera) & Accessibility Text
        doc.select(".article-featured-list, .featured-list, .more-on-aljazeera").remove()
        doc.select(".sr-only, .visually-hidden, .screen-reader-text").remove()

        // D. Text-Based Header Removal ("Recommended Stories")
        removeHeadersWithText(doc, "Recommended Stories")
        removeHeadersWithText(doc, "Related Stories")

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
        val headers = doc.select("h1, h2, h3, h4, h5, h6, strong, span, div")
        for (header in headers) {
            if (header.text().contains(text, ignoreCase = true)) {
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
        val candidates = doc.select("p, ul, ol, div") 
        for (node in candidates) {
            val totalText = node.text().trim()
            if (totalText.length < 10) continue 

            val links = node.select("a")
            if (links.isEmpty()) continue

            val linkTextLength = links.sumOf { it.text().length }
            val density = linkTextLength.toDouble() / totalText.length.toDouble()

            // If > 50% links, it's likely navigation noise
            if (density > 0.5) {
                // Be careful not to delete huge containers (likely the main wrapper)
                if (totalText.length < 800 || node.tagName() == "ul" || node.tagName() == "ol") {
                    node.remove()
                }
            }
        }
    }
}
```

---

## 3. WebView Fallback Strategy (Implementation Guide)

You need to implement this in your `Activity` or `ViewModel`.

### Concept
1.  Launch `SmartScraper.scrapeUrl(url)` in a background thread (Coroutine `Dispatchers.IO`).
2.  If it returns a valid String -> Success! Display it.
3.  If it returns `null` (likely 403 Forbidden), switch to `WebView`.

### The "Invisible" WebView Hack
You don't need to show the WebView to the user. You can load it, wait for `onPageFinished`, inject JS to grab the HTML, and then destroy it.

**Step 1: The JavaScript Interface**
Create a class to receive HTML from the WebView.
```kotlin
class WebAppInterface(private val onHtmlReceived: (String) -> Unit) {
    @android.webkit.JavascriptInterface
    fun processHTML(html: String) {
        onHtmlReceived(html)
    }
}
```

**Step 2: Configuring the WebView**
```kotlin
// In your Activity or Fragment
val webView = WebView(context)
webView.settings.javaScriptEnabled = true
webView.settings.userAgentString = "Mozilla/5.0..." // Match chrome
webView.addJavascriptInterface(WebAppInterface { html ->
    // SUCCESS! We got the HTML from the rendered page.
    // Now pass it back to our cleaner:
    val cleanText = SmartScraper.processHtmlFromWebView(html, url)
    runOnUiThread { 
        // Update UI with cleanText 
    }
}, "Android")

webView.webViewClient = object : WebViewClient() {
    override fun onPageFinished(view: WebView?, url: String?) {
        // Inject JS to extract the full HTML
        webView.loadUrl("javascript:window.Android.processHTML(document.documentElement.outerHTML);")
    }
}

// Start loading
webView.loadUrl(targetUrl)
```

### Summary of Flow
1.  **Try Fast Path (Jsoup)** -> If 200 OK -> Clean & Show.
2.  **If 403/Error** -> **Fallback to WebView** (Hidden) -> Wait for Load -> Inject JS -> Get HTML -> Clean & Show.
