import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

public final class WebExtractorProbe {
    private static final int MINIMUM_ARTICLE_LENGTH = 180;

    private static final List<String> PRIMARY_SELECTORS = List.of(
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
    );

    private static final List<String> PRUNE_KEYWORDS = List.of(
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
    );

    private static final List<String> SKIP_TEXT_PATTERNS = List.of(
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
    );

    private static final List<String> TERMINAL_SECTION_HEADINGS = List.of(
        "tags",
        "help us get the word out",
        "audio broadcast",
        "call to action",
        "related reports",
        "next post"
    );

    private static final List<String> STANDALONE_JUNK_HEADINGS = List.of(
        "recommended stories",
        "related reports",
        "read more like this",
        "view comments",
        "audio broadcast",
        "call to action",
        "unlocking article",
        "advertisement"
    );

    private WebExtractorProbe() {
    }

    public static void main(String[] args) throws Exception {
        Options options = Options.parse(args);

        if (options.inputFile != null) {
            ExtractionResult result = extractFromFile(options.inputFile, options.debug);
            printResult(result, options.debug);
            return;
        }

        if (options.url == null || options.url.isBlank()) {
            System.err.println(
                "Usage: java WebExtractorProbe [--insecure] [--debug] [--save-html <path>] <url>\n" +
                    "   or: java WebExtractorProbe --input-file <path> [--debug]"
            );
            System.exit(1);
        }

        ExtractionResult result = extract(options.url, options.insecure, options.debug);
        if (options.saveHtml != null && result.rawHtml != null) {
            writeFile(options.saveHtml, result.rawHtml);
            System.out.println("SAVED_HTML: " + options.saveHtml.toAbsolutePath());
        }

        printResult(result, options.debug);
    }

    public static ExtractionResult extract(String url, boolean insecure, boolean debug)
        throws IOException, InterruptedException {
        HttpClient.Builder clientBuilder = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(20));

        if (insecure) {
            clientBuilder.sslContext(buildInsecureSslContext());
            SSLParameters sslParameters = new SSLParameters();
            sslParameters.setEndpointIdentificationAlgorithm("");
            clientBuilder.sslParameters(sslParameters);
        }

        HttpClient client = clientBuilder.build();

        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
            .timeout(Duration.ofSeconds(30))
            .header(
                "User-Agent",
                "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 " +
                    "(KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36"
            )
            .GET()
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("Request failed with HTTP " + response.statusCode());
        }

        ExtractionResult initial = parseHtml(
            response.body(),
            response.uri().toString(),
            "network",
            debug
        );

        Document firstDocument = Jsoup.parse(response.body(), response.uri().toString());
        String ampUrl = resolveAmpUrl(firstDocument);
        if (
            ampUrl != null &&
            shouldTryAmpFallback(firstDocument, initial)
        ) {
            HttpRequest ampRequest = HttpRequest.newBuilder(URI.create(ampUrl))
                .timeout(Duration.ofSeconds(30))
                .header(
                    "User-Agent",
                    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 " +
                        "(KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36"
                )
                .GET()
                .build();

            HttpResponse<String> ampResponse = client.send(ampRequest, HttpResponse.BodyHandlers.ofString());
            if (ampResponse.statusCode() >= 200 && ampResponse.statusCode() < 300) {
                ExtractionResult ampResult = parseHtml(
                    ampResponse.body(),
                    response.uri().toString(),
                    "network-amp",
                    debug
                );
                if (ampResult.extractedText.length() > initial.extractedText.length()) {
                    return ampResult;
                }
            }
        }

        return initial;
    }

    public static ExtractionResult extractFromFile(Path file, boolean debug) throws IOException {
        String html = Files.readString(file, StandardCharsets.UTF_8);
        String source = file.toAbsolutePath().toString();
        return parseHtml(html, source, "file", debug);
    }

    private static ExtractionResult parseHtml(
        String html,
        String source,
        String mode,
        boolean debug
    ) {
        Document originalDocument = Jsoup.parse(html, source);
        DebugInfo debugInfo = debug ? collectDebugInfo(originalDocument) : null;
        Element root = selectBestRoot(originalDocument);
        String extractedText = extractFromBestRoot(root, originalDocument);
        String title = resolveTitle(originalDocument, source);
        String languageCode = null;
        Element htmlElement = originalDocument.selectFirst("html");
        if (htmlElement != null) {
            String lang = htmlElement.attr("lang");
            if (!lang.isBlank()) {
                languageCode = lang.split("-", 2)[0];
            }
        }

        String rootSummary = root == null ? "<body fallback>" : summarizeElement(root);
        return new ExtractionResult(
            source,
            title,
            languageCode,
            extractedText,
            extractedText.length() < MINIMUM_ARTICLE_LENGTH || looksPaywalled(originalDocument, extractedText),
            html,
            mode,
            rootSummary,
            debugInfo
        );
    }

    private static String extractFromBestRoot(Element root, Document originalDocument) {
        if (root != null) {
            Element workingRoot = root.clone();
            sanitizeElementTree(workingRoot);
            return extractReadableText(workingRoot);
        }

        Document fallbackDocument = originalDocument.clone();
        sanitizeDocument(fallbackDocument);
        return extractReadableText(fallbackDocument.body());
    }

    private static void printResult(ExtractionResult result, boolean debug) {
        System.out.println("SOURCE: " + result.source);
        System.out.println("MODE: " + result.mode);
        System.out.println("TITLE: " + result.title);
        System.out.println("LANG: " + result.languageCode);
        System.out.println("TEXT_LENGTH: " + result.extractedText.length());
        System.out.println("LIKELY_INCOMPLETE: " + result.likelyIncomplete);
        System.out.println("SELECTED_ROOT: " + result.selectedRoot);
        if (debug && result.debugInfo != null) {
            System.out.println("TOP_CANDIDATES:");
            for (String candidate : result.debugInfo.topCandidates) {
                System.out.println("  " + candidate);
            }
        }
        System.out.println();
        System.out.println(result.extractedText);
    }

    private static void sanitizeDocument(Document document) {
        document.select(
            "script, style, nav, footer, header, noscript, form, iframe, svg, " +
                "button, input, picture, source, video, audio, canvas"
        ).remove();

        sanitizeElementTree(document);
    }

    private static void sanitizeElementTree(Element root) {
        root.select(
            "script, style, nav, footer, header, noscript, form, iframe, svg, " +
                "button, input, picture, source, video, audio, canvas"
        ).remove();

        List<Element> elements = new ArrayList<>(root.select("*"));
        for (Element element : elements) {
            if (shouldPruneElement(element)) {
                element.remove();
            }
        }
    }

    private static Element selectBestRoot(Document document) {
        for (String selector : PRIMARY_SELECTORS) {
            for (Element candidate : document.select(selector)) {
                if (isValidContentRoot(candidate)) {
                    return candidate;
                }
            }
        }

        Element best = null;
        int bestScore = Integer.MIN_VALUE;
        for (Element candidate : document.select("article, main, [role=main], section, div")) {
            int score = scoreContentRoot(candidate);
            if (score > bestScore && isValidContentRoot(candidate)) {
                best = candidate;
                bestScore = score;
            }
        }
        return best;
    }

    private static DebugInfo collectDebugInfo(Document document) {
        List<ElementScore> scored = new ArrayList<>();
        for (Element candidate : document.select("article, main, [role=main], section, div")) {
            if (candidate.text().length() < 80) {
                continue;
            }
            scored.add(new ElementScore(candidate, scoreContentRoot(candidate), isValidContentRoot(candidate)));
        }

        scored.sort((left, right) -> Integer.compare(right.score, left.score));
        List<String> topCandidates = new ArrayList<>();
        for (int index = 0; index < Math.min(8, scored.size()); index++) {
            ElementScore item = scored.get(index);
            topCandidates.add(
                "[" + item.score + "] " +
                    (item.valid ? "valid " : "invalid ") +
                    summarizeElement(item.element)
            );
        }
        return new DebugInfo(topCandidates);
    }

    private static boolean isValidContentRoot(Element element) {
        if (element == null) {
            return false;
        }
        if (shouldPruneElement(element)) {
            return false;
        }
        if (element.text().length() < 180) {
            return false;
        }
        return scoreContentRoot(element) >= 280;
    }

    private static int scoreContentRoot(Element element) {
        int paragraphCount = element.select("p").size();
        int paragraphTextLength = element.select("p").stream().mapToInt(p -> p.text().length()).sum();
        int articleHint = hasArticleHint(element) ? 250 : 0;
        int bodyHint = hasBodyHint(element) ? 180 : 0;
        int junkPenalty = hasJunkHint(element) ? 500 : 0;
        return paragraphTextLength + (paragraphCount * 120) + articleHint + bodyHint - junkPenalty;
    }

    private static String extractReadableText(Element root) {
        if (root == null) {
            return "";
        }

        Element workingRoot = root.clone();
        List<Element> elements = new ArrayList<>(workingRoot.select("*"));
        for (Element element : elements) {
            if (shouldPruneElement(element)) {
                element.remove();
            }
        }

        List<String> blocks = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();

        for (Element element : workingRoot.select("h2, h3, h4, p, li, blockquote, pre")) {
            if (shouldSkipTextElement(element)) {
                continue;
            }

            String text = normalizeText(element.text());
            if (text.isBlank()) {
                continue;
            }

            if (isTerminalSectionHeading(text, element)) {
                break;
            }

            if (isSkippableStandaloneText(text, element)) {
                continue;
            }

            int minimumLength = element.tagName().startsWith("h") ? 12 : 28;
            if (text.length() < minimumLength) {
                continue;
            }

            if (seen.add(text)) {
                blocks.add(text);
            }
        }

        if (!blocks.isEmpty()) {
            return String.join("\n\n", blocks);
        }

        String[] fragments = normalizeText(workingRoot.text())
            .split("(?<=[.!?\\u3002\\uFF01\\uFF1F])\\s+");
        List<String> fallback = new ArrayList<>();
        Set<String> fallbackSeen = new LinkedHashSet<>();
        for (String fragment : fragments) {
            String cleaned = normalizeText(fragment);
            if (cleaned.length() >= 30 && fallbackSeen.add(cleaned)) {
                fallback.add(cleaned);
            }
        }
        return String.join("\n\n", fallback);
    }

    private static String resolveTitle(Document document, String source) {
        Element metaTitle = document.selectFirst("meta[property=og:title]");
        if (metaTitle != null) {
            String content = metaTitle.attr("content").trim();
            if (!content.isBlank()) {
                return content;
            }
        }

        String title = document.title().trim();
        return title.isBlank() ? source : title;
    }

    private static boolean shouldPruneElement(Element element) {
        String ownText = normalizeText(element.ownText());
        String combinedHints = (
            element.tagName() + " " +
                element.id() + " " +
                element.className() + " " +
                element.attr("role") + " " +
                element.attr("aria-label") + " " +
                element.attr("data-testid") + " " +
                element.attr("data-module")
            ).toLowerCase(Locale.ROOT);

        if (combinedHints.contains("article-body") || combinedHints.contains("article__body")) {
            return false;
        }

        if (containsAny(combinedHints, PRUNE_KEYWORDS)) {
            return true;
        }

        if (!Set.of("article", "main", "body").contains(element.tagName())) {
            for (Element heading : element.select("h1, h2, h3, h4, h5")) {
                if (isStandaloneJunkHeading(normalizeText(heading.text()))) {
                    return true;
                }
            }
        }

        if (hasAdLikeHint(combinedHints) && !hasArticleHint(element)) {
            return true;
        }

        return isStandaloneJunkHeading(ownText);
    }

    private static boolean shouldSkipTextElement(Element element) {
        String text = normalizeText(element.text());
        if (text.isBlank()) {
            return true;
        }
        for (Element parent : element.parents()) {
            if (shouldPruneElement(parent)) {
                return true;
            }
        }
        return containsAny(text.toLowerCase(Locale.ROOT), SKIP_TEXT_PATTERNS);
    }

    private static boolean isSkippableStandaloneText(String text, Element element) {
        if (containsAny(text.toLowerCase(Locale.ROOT), SKIP_TEXT_PATTERNS)) {
            return true;
        }
        return element.tagName().equals("li") && text.length() < 45;
    }

    private static boolean isTerminalSectionHeading(String text, Element element) {
        if (!element.tagName().startsWith("h")) {
            return false;
        }
        String normalized = text.toLowerCase(Locale.ROOT);
        for (String marker : TERMINAL_SECTION_HEADINGS) {
            if (normalized.equals(marker) || normalized.startsWith(marker + ":")) {
                return true;
            }
        }
        return false;
    }

    private static boolean isStandaloneJunkHeading(String text) {
        if (text.isBlank()) {
            return false;
        }
        String normalized = text.toLowerCase(Locale.ROOT);
        for (String marker : STANDALONE_JUNK_HEADINGS) {
            if (normalized.equals(marker) || normalized.startsWith(marker + ":")) {
                return true;
            }
        }
        return false;
    }

    private static boolean hasArticleHint(Element element) {
        String hints = (
            element.id() + " " +
                element.className() + " " +
                element.attr("itemprop")
            ).toLowerCase(Locale.ROOT);
        return containsAny(hints, List.of("article", "story", "entry", "post", "content"));
    }

    private static boolean hasBodyHint(Element element) {
        String hints = (
            element.id() + " " +
                element.className() + " " +
                element.attr("itemprop")
            ).toLowerCase(Locale.ROOT);
        return containsAny(hints, List.of("body", "main", "text", "copy", "content"));
    }

    private static boolean hasJunkHint(Element element) {
        String hints = (element.id() + " " + element.className()).toLowerCase(Locale.ROOT);
        return containsAny(hints, PRUNE_KEYWORDS);
    }

    private static boolean hasAdLikeHint(String text) {
        return text.matches(".*(^|[^a-z])(ad|ads|advert|adslot)([^a-z]|$).*");
    }

    private static String resolveAmpUrl(Document document) {
        Element ampLink = document.selectFirst("link[rel=amphtml]");
        if (ampLink == null) {
            return null;
        }
        String href = ampLink.attr("href").trim();
        return href.isBlank() ? null : href;
    }

    private static boolean shouldTryAmpFallback(Document document, ExtractionResult result) {
        if (result.extractedText.length() < MINIMUM_ARTICLE_LENGTH) {
            return true;
        }

        String pageText = normalizeText(document.text()).toLowerCase(Locale.ROOT);
        return result.extractedText.length() < 500 && (
            pageText.contains("analysis") ||
                pageText.contains("listen to this article") ||
                pageText.contains("watch:") ||
                pageText.contains("video duration")
        );
    }

    private static boolean looksPaywalled(Document document, String extractedText) {
        if (extractedText.length() >= MINIMUM_ARTICLE_LENGTH) {
            return false;
        }

        String pageText = normalizeText(document.text()).toLowerCase(Locale.ROOT);
        return pageText.contains("unlocking article") ||
            pageText.contains("subscribe to continue") ||
            pageText.contains("subscriber only") ||
            pageText.contains("sign in to read") ||
            pageText.contains("login to continue") ||
            pageText.contains("members only") ||
            document.select("meta[name=mk:free][content=false]").size() > 0 ||
            document.select("script[type=application/ld+json]")
                .stream()
                .map(Element::data)
                .anyMatch(data -> data.contains("\"isAccessibleForFree\":\"False\""));
    }

    private static boolean containsAny(String text, List<String> values) {
        for (String value : values) {
            if (text.contains(value.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private static String normalizeText(String text) {
        String normalized = text.replace('\u00A0', ' ');
        normalized = normalized.replaceAll("[\\t\\x0B\\f\\r ]+", " ");
        normalized = normalized.replaceAll("\\n{3,}", "\n\n");

        String[] lines = normalized.split("\\R");
        List<String> cleaned = new ArrayList<>();
        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.isBlank()) {
                cleaned.add(trimmed);
            }
        }
        return String.join("\n", cleaned).trim();
    }

    private static String summarizeElement(Element element) {
        String id = element.id().isBlank() ? "" : "#" + element.id();
        String className = element.className().isBlank()
            ? ""
            : "." + element.className().trim().replace(' ', '.');
        int textLength = normalizeText(element.text()).length();
        return "<" + element.tagName() + id + className + "> len=" + textLength;
    }

    private static void writeFile(Path path, String contents) throws IOException {
        Path parent = path.toAbsolutePath().getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
        Files.writeString(path, contents, StandardCharsets.UTF_8);
    }

    public record ExtractionResult(
        String source,
        String title,
        String languageCode,
        String extractedText,
        boolean likelyIncomplete,
        String rawHtml,
        String mode,
        String selectedRoot,
        DebugInfo debugInfo
    ) {}

    public record DebugInfo(List<String> topCandidates) {}

    private record ElementScore(Element element, int score, boolean valid) {}

    private record Options(
        String url,
        boolean insecure,
        boolean debug,
        Path saveHtml,
        Path inputFile
    ) {
        private static Options parse(String[] args) {
            boolean insecure = false;
            boolean debug = false;
            Path saveHtml = null;
            Path inputFile = null;
            String url = null;

            for (int index = 0; index < args.length; index++) {
                String arg = args[index];
                switch (arg) {
                    case "--insecure" -> insecure = true;
                    case "--debug" -> debug = true;
                    case "--save-html" -> {
                        if (index + 1 >= args.length) {
                            throw new IllegalArgumentException("--save-html requires a path");
                        }
                        saveHtml = Path.of(args[++index]);
                    }
                    case "--input-file" -> {
                        if (index + 1 >= args.length) {
                            throw new IllegalArgumentException("--input-file requires a path");
                        }
                        inputFile = Path.of(args[++index]);
                    }
                    default -> {
                        if (url == null) {
                            url = arg.trim();
                        } else {
                            throw new IllegalArgumentException("Unexpected extra argument: " + arg);
                        }
                    }
                }
            }

            return new Options(url, insecure, debug, saveHtml, inputFile);
        }
    }

    private static SSLContext buildInsecureSslContext() {
        try {
            TrustManager[] trustAll = new TrustManager[] {
                new X509TrustManager() {
                    @Override
                    public void checkClientTrusted(X509Certificate[] chain, String authType) {
                    }

                    @Override
                    public void checkServerTrusted(X509Certificate[] chain, String authType) {
                    }

                    @Override
                    public X509Certificate[] getAcceptedIssuers() {
                        return new X509Certificate[0];
                    }
                }
            };

            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, trustAll, new SecureRandom());
            return sslContext;
        } catch (Exception error) {
            throw new IllegalStateException("Couldn't build insecure SSL context", error);
        }
    }
}
