#!/usr/bin/env python3
"""Simple, configurable web scraper.

Features:
- Fetches a page with optional custom user-agent
- Extracts matching elements using a CSS selector
- Optionally follows pagination links ("next" selector)
- Saves output to JSON or CSV

Example:
python scraper.py --url "https://quotes.toscrape.com" --selector ".quote" --text-only --max-pages 2 --next-selector "li.next a" --output quotes.json
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
from dataclasses import dataclass
from typing import Iterable
from urllib.parse import quote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup


DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)


@dataclass
class ScrapeResult:
    page_url: str
    element_index: int
    text: str
    html: str
    href: str | None


@dataclass
class NewsResult:
    page_url: str
    element_index: int
    title: str
    href: str


@dataclass
class ArticleContent:
    url: str
    title: str
    content: str
    word_count: int


def parse_cookie_string(cookie_header: str) -> dict[str, str]:
    cookies: dict[str, str] = {}
    for part in cookie_header.split(";"):
        chunk = part.strip()
        if not chunk or "=" not in chunk:
            continue
        name, value = chunk.split("=", 1)
        name = name.strip()
        value = value.strip()
        if name:
            cookies[name] = value
    return cookies


def load_cookies(cookie_text: str | None, cookie_file: str | None) -> dict[str, str]:
    raw = ""
    if cookie_file:
        try:
            with open(cookie_file, "r", encoding="utf-8") as f:
                raw = f.read().strip()
        except OSError as exc:
            raise ValueError(f"Could not read cookie file '{cookie_file}': {exc}") from exc
    if cookie_text:
        raw = f"{raw}; {cookie_text}".strip("; ").strip() if raw else cookie_text.strip()
    if not raw:
        return {}
    cookies = parse_cookie_string(raw)
    if not cookies:
        raise ValueError("No valid cookie pairs found. Use format: key1=value1; key2=value2")
    return cookies


def render_with_playwright(
    url: str, timeout: int, user_agent: str, cookies: dict[str, str] | None = None
) -> str:
    try:
        from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise RuntimeError(
            "Playwright is not installed. Install with: pip install playwright && playwright install chromium"
        ) from exc

    parsed = urlparse(url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    timeout_ms = max(timeout * 1000, 15000)

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            context = browser.new_context(user_agent=user_agent, ignore_https_errors=True)
            if cookies:
                context.add_cookies(
                    [{"name": k, "value": v, "url": origin} for k, v in cookies.items()]
                )
            page = context.new_page()
            page.set_extra_http_headers(
                {
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                }
            )
            page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
            try:
                page.wait_for_load_state("networkidle", timeout=timeout_ms)
            except PlaywrightTimeoutError:
                pass
            content = page.content()
            browser.close()
            return content
    except Exception as exc:
        raise RuntimeError(f"Playwright rendering failed for {url}: {exc}") from exc


def fetch_html(
    url: str,
    timeout: int,
    user_agent: str,
    cookies: dict[str, str] | None = None,
    use_js_render: bool = True,
) -> str:
    headers = {
        "User-Agent": user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    response = requests.get(url, headers=headers, cookies=cookies or {}, timeout=timeout)
    try:
        response.raise_for_status()
        return response.text
    except requests.HTTPError:
        status = response.status_code
        parsed = urlparse(url)
        is_jina = parsed.netloc.lower() == "r.jina.ai"
        if use_js_render and not is_jina and status in {401, 403, 429, 451}:
            try:
                return render_with_playwright(url, timeout, user_agent, cookies)
            except RuntimeError as js_exc:
                js_error = js_exc
        else:
            js_error = None
        can_retry_with_jina = status in {401, 403, 429} and not is_jina
        if not can_retry_with_jina:
            if js_error is not None:
                raise RuntimeError(str(js_error)) from None
            raise

        encoded_path = quote(parsed.path or "/", safe="/")
        mirror_url = f"https://r.jina.ai/http://{parsed.netloc}{encoded_path}"
        if parsed.query:
            mirror_url = f"{mirror_url}?{parsed.query}"
        mirror_timeout = max(timeout, 45)
        try:
            mirror_response = requests.get(mirror_url, headers=headers, timeout=mirror_timeout)
            mirror_response.raise_for_status()
            return mirror_response.text
        except requests.RequestException as mirror_exc:
            if use_js_render:
                try:
                    return render_with_playwright(url, timeout, user_agent, cookies)
                except RuntimeError as js_exc:
                    raise RuntimeError(
                        f"Blocked by site and mirror failed ({mirror_exc}). {js_exc}"
                    ) from None
            raise
    except requests.RequestException:
        if use_js_render:
            return render_with_playwright(url, timeout, user_agent, cookies)
        raise


def parse_elements(html: str, selector: str, base_url: str) -> list[ScrapeResult]:
    soup = BeautifulSoup(html, "html.parser")
    items = soup.select(selector)
    results: list[ScrapeResult] = []

    for idx, el in enumerate(items, start=1):
        href = el.get("href")
        full_href = urljoin(base_url, href) if href else None
        results.append(
            ScrapeResult(
                page_url=base_url,
                element_index=idx,
                text=el.get_text(" ", strip=True),
                html=str(el),
                href=full_href,
            )
        )

    return results


def _clean_text(value: str) -> str:
    return " ".join(value.split()).strip()


def parse_news(html: str, base_url: str) -> list[NewsResult]:
    soup = BeautifulSoup(html, "html.parser")
    parsed_base = urlparse(base_url)
    base_domain = parsed_base.netloc.lower().replace("www.", "")
    ignored_text = {
        "home",
        "about",
        "contact",
        "privacy",
        "terms",
        "login",
        "log in",
        "sign in",
        "subscribe",
        "newsletter",
        "advertise",
        "careers",
        "help",
    }

    candidates: list[tuple[int, str, str]] = []
    selectors = [
        "article a[href]",
        "h1 a[href]",
        "h2 a[href]",
        "h3 a[href]",
        ".headline a[href]",
        ".title a[href]",
    ]
    seen: set[tuple[str, str]] = set()

    for css in selectors:
        for anchor in soup.select(css):
            title = _clean_text(anchor.get_text(" ", strip=True))
            href = anchor.get("href")
            if not href:
                continue
            full_href = urljoin(base_url, href).strip()
            lowered_href = full_href.lower()
            if (
                not title
                or len(title) < 8
                or title.lower() in ignored_text
                or lowered_href.startswith("javascript:")
                or lowered_href.startswith("mailto:")
                or "#" == full_href
            ):
                continue

            parsed_link = urlparse(full_href)
            link_domain = parsed_link.netloc.lower().replace("www.", "")
            if link_domain and base_domain and link_domain != base_domain:
                continue

            key = (title.lower(), full_href)
            if key in seen:
                continue
            seen.add(key)
            candidates.append((len(candidates), title, full_href))

    results: list[NewsResult] = []
    for idx, (_, title, href) in enumerate(candidates, start=1):
        results.append(
            NewsResult(
                page_url=base_url,
                element_index=idx,
                title=title,
                href=href,
            )
        )
    return results


def _is_probable_article_url(url: str, base_domain: str) -> bool:
    parsed = urlparse(url)
    domain = parsed.netloc.lower().replace("www.", "")
    path = parsed.path.lower().strip("/")
    if not path:
        return False
    if domain and base_domain and domain != base_domain:
        return False
    blocked_tokens = {
        "about",
        "contact",
        "privacy",
        "terms",
        "login",
        "signup",
        "subscribe",
        "newsletter",
        "video",
        "videos",
        "podcast",
        "podcasts",
        "tag",
        "tags",
        "category",
        "author",
    }
    path_parts = [part for part in path.split("/") if part]
    if any(part in blocked_tokens for part in path_parts):
        return False
    if len(path_parts) < 1:
        return False
    return True


def _extract_text_from_container(container: BeautifulSoup) -> str:
    blocks = container.select("p")
    if len(blocks) >= 2:
        chunks = [_clean_text(block.get_text(" ", strip=True)) for block in blocks]
    else:
        blocks = container.select("p, li")
        chunks = [_clean_text(block.get_text(" ", strip=True)) for block in blocks]
    cleaned = [c for c in chunks if len(c) >= 30]
    return "\n".join(cleaned).strip()


def _sanitize_extracted_text(text: str) -> str:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    cleaned_lines: list[str] = []
    for line in lines:
        lowered = line.lower()
        if any(
            token in lowered
            for token in (
                "sponsored",
                "promoted links",
                "ikuti kami",
                "langgan & nikmati pengalaman tanpa iklan",
                "image ",
                "undo",
            )
        ):
            continue
        line = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", line)
        line = re.sub(r"\[[^\]]+\]\([^)]+\)", "", line)
        line = re.sub(r"\s{2,}", " ", line).strip()
        if len(line) < 20:
            continue
        cleaned_lines.append(line)
    return "\n".join(cleaned_lines).strip()


def _extract_text_from_mirror_markdown(raw: str) -> tuple[str, str]:
    title = ""
    title_match = re.search(r"^Title:\s*(.+)$", raw, flags=re.MULTILINE)
    if title_match:
        title = _clean_text(title_match.group(1))

    if "Markdown Content:" in raw:
        body = raw.split("Markdown Content:", 1)[1]
    else:
        body = raw

    # Convert markdown links/images to plain text.
    body = re.sub(r"!\[[^\]]*\]\([^)]+\)", " ", body)
    body = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", body)
    body = re.sub(r"https?://\S+", " ", body)

    lines = [ln.strip() for ln in body.splitlines() if ln.strip()]
    cleaned: list[str] = []
    ignore_tokens = (
        "sponsored",
        "promoted links",
        "ikuti kami",
        "langgan",
        "undo",
        "image ",
        "baca di sini",
        "apple app store",
        "google play",
        "log masuk",
    )

    for line in lines:
        low = line.lower()
        if any(tok in low for tok in ignore_tokens):
            continue
        if low.startswith("title:") or low.startswith("url source:") or low.startswith(
            "published time:"
        ):
            continue
        if re.fullmatch(r"[=#*\-\s|]+", line):
            continue
        if any(ch in line for ch in "[](){}"):
            continue
        if len(line) < 35:
            continue
        if len(line.split()) < 8:
            continue
        if line.count("|") >= 2:
            continue
        if line.count("*") >= 3:
            continue
        if "berita harian" in low and "terkini:" not in low:
            continue
        if "new straits times press" in low:
            continue
        line = re.sub(r"\s{2,}", " ", line).strip()
        cleaned.append(line)

    # Keep order but drop duplicates.
    deduped = list(dict.fromkeys(cleaned))
    content = "\n".join(deduped).strip()
    return title, content


def extract_main_content(html: str, url: str) -> ArticleContent:
    if "Markdown Content:" in html and "<html" not in html[:1000].lower():
        md_title, md_content = _extract_text_from_mirror_markdown(html)
        if len(md_content) > 120000:
            md_content = md_content[:120000]
        return ArticleContent(
            url=url,
            title=md_title,
            content=md_content,
            word_count=len(md_content.split()),
        )

    soup = BeautifulSoup(html, "html.parser")
    for tag in soup.select(
        "script, style, noscript, form, nav, header, footer, aside, svg, iframe"
    ):
        tag.decompose()

    title = ""
    if soup.h1:
        title = _clean_text(soup.h1.get_text(" ", strip=True))
    if not title and soup.title:
        title = _clean_text(soup.title.get_text(" ", strip=True))

    containers = []
    selector_priority = [
        "article",
        "main",
        "[role='main']",
        ".post-content",
        ".entry-content",
        ".article-body",
        ".story-body",
        ".content",
    ]
    for css in selector_priority:
        containers.extend(soup.select(css))
    if soup.body:
        containers.append(soup.body)
    if not containers:
        containers = [soup]

    best_content = ""
    for container in containers:
        candidate = _extract_text_from_container(container)
        if len(candidate) > len(best_content):
            best_content = candidate

    if not best_content:
        best_content = _clean_text(soup.get_text(" ", strip=True))

    if len(best_content) > 120000:
        best_content = best_content[:120000]
    raw_best_content = best_content
    cleaned_content = _sanitize_extracted_text(best_content)
    if len(cleaned_content.split()) >= 40:
        best_content = cleaned_content
    else:
        best_content = raw_best_content

    word_count = len(best_content.split())
    return ArticleContent(url=url, title=title, content=best_content, word_count=word_count)


def find_next_url(html: str, next_selector: str | None, current_url: str) -> str | None:
    if not next_selector:
        return None

    soup = BeautifulSoup(html, "html.parser")
    next_el = soup.select_one(next_selector)
    if not next_el:
        return None

    href = next_el.get("href")
    if not href:
        return None

    return urljoin(current_url, href)


def save_json(path: str, rows: Iterable[dict]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(list(rows), f, ensure_ascii=False, indent=2)


def save_csv(path: str, rows: list[dict]) -> None:
    if not rows:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write("")
        return

    fieldnames = list(rows[0].keys())
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description="Configurable Python web scraper")
    parser.add_argument("url_pos", nargs="?", help="Starting URL (positional)")
    parser.add_argument("--url", default=None, help="Starting URL")
    parser.add_argument(
        "--selector",
        default=None,
        help="CSS selector to extract (optional in --news mode)",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Optional output file path (.json or .csv). If omitted, nothing is saved.",
    )
    parser.add_argument("--timeout", type=int, default=15, help="HTTP timeout in seconds")
    parser.add_argument(
        "--user-agent", default=DEFAULT_USER_AGENT, help="Custom user-agent string"
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=1,
        help="Maximum number of pages to scrape (default: 1)",
    )
    parser.add_argument(
        "--next-selector",
        default=None,
        help="CSS selector for the next-page link (e.g. 'li.next a')",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.0,
        help="Delay in seconds between page requests",
    )
    parser.add_argument(
        "--text-only",
        action="store_true",
        help="Save only text plus metadata (omit full HTML)",
    )
    parser.add_argument(
        "--news",
        action="store_true",
        help="Auto-extract headline-like news links from the page",
    )
    parser.add_argument(
        "--print-results",
        action="store_true",
        help="Print extracted items to the terminal (default: enabled)",
    )
    parser.add_argument(
        "--content",
        action="store_true",
        help="Extract full article content from discovered links (or directly from single article URL)",
    )
    parser.add_argument(
        "--max-articles",
        type=int,
        default=20,
        help="Maximum number of article pages to fetch in --content mode",
    )
    parser.add_argument(
        "--cookie",
        default=None,
        help="Cookie header string, e.g. 'name=value; other=value'",
    )
    parser.add_argument(
        "--cookie-file",
        default=None,
        help="Path to a text file containing a cookie header string",
    )
    parser.add_argument(
        "--js-render",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Enable JavaScript rendering fallback with Playwright (default: enabled)",
    )

    args = parser.parse_args()
    target_url = args.url or args.url_pos
    if not target_url:
        print("Error: provide a URL as `python scraper.py <url>`", file=sys.stderr)
        return 2

    if args.max_pages < 1:
        print("Error: --max-pages must be at least 1", file=sys.stderr)
        return 2
    if args.max_articles < 1:
        print("Error: --max-articles must be at least 1", file=sys.stderr)
        return 2
    try:
        request_cookies = load_cookies(args.cookie, args.cookie_file)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2

    all_rows: list[dict] = []
    current_url = target_url
    discovered_links: list[dict] = []
    seen_links: set[str] = set()
    auto_content_mode = args.content or (
        args.selector is None and not args.news and args.url_pos is not None and args.url is None
    )

    for page_num in range(1, args.max_pages + 1):
        try:
            html = fetch_html(
                current_url,
                timeout=args.timeout,
                user_agent=args.user_agent,
                cookies=request_cookies,
                use_js_render=args.js_render,
            )
        except (requests.RequestException, RuntimeError) as exc:
            print(f"Request failed on page {page_num} ({current_url}): {exc}", file=sys.stderr)
            return 1

        if auto_content_mode:
            parsed_news = parse_news(html, base_url=current_url)
            base_domain = urlparse(current_url).netloc.lower().replace("www.", "")
            for row in parsed_news:
                if row.href in seen_links:
                    continue
                if not _is_probable_article_url(row.href, base_domain):
                    continue
                seen_links.add(row.href)
                discovered_links.append(
                    {
                        "source_page": row.page_url,
                        "discovered_title": row.title,
                        "href": row.href,
                    }
                )
        elif args.news or not args.selector:
            parsed_news = parse_news(html, base_url=current_url)
            for row in parsed_news:
                item = {
                    "page_url": row.page_url,
                    "element_index": row.element_index,
                    "title": row.title,
                    "href": row.href,
                }
                all_rows.append(item)
        else:
            parsed = parse_elements(html, selector=args.selector, base_url=current_url)
            for row in parsed:
                item = {
                    "page_url": row.page_url,
                    "element_index": row.element_index,
                    "text": row.text,
                    "href": row.href,
                }
                if not args.text_only:
                    item["html"] = row.html
                all_rows.append(item)

        if page_num >= args.max_pages:
            break

        next_url = find_next_url(html, next_selector=args.next_selector, current_url=current_url)
        if not next_url:
            break

        current_url = next_url
        if args.delay > 0:
            time.sleep(args.delay)

    if auto_content_mode:
        if not discovered_links:
            # Input might already be a single article URL.
            try:
                html = fetch_html(
                    target_url,
                    timeout=args.timeout,
                    user_agent=args.user_agent,
                    cookies=request_cookies,
                    use_js_render=args.js_render,
                )
                article = extract_main_content(html, target_url)
                if article.word_count >= 40:
                    all_rows.append(
                        {
                            "source_page": target_url,
                            "url": article.url,
                            "title": article.title,
                            "content": article.content,
                            "word_count": article.word_count,
                        }
                    )
            except (requests.RequestException, RuntimeError) as exc:
                print(f"Request failed for article ({target_url}): {exc}", file=sys.stderr)
                return 1
        else:
            for link in discovered_links[: args.max_articles]:
                try:
                    article_html = fetch_html(
                        link["href"],
                        timeout=args.timeout,
                        user_agent=args.user_agent,
                        cookies=request_cookies,
                        use_js_render=args.js_render,
                    )
                except (requests.RequestException, RuntimeError):
                    continue
                article = extract_main_content(article_html, link["href"])
                if article.word_count < 40:
                    continue
                all_rows.append(
                    {
                        "source_page": link["source_page"],
                        "url": article.url,
                        "title": article.title or link["discovered_title"],
                        "content": article.content,
                        "word_count": article.word_count,
                    }
                )
                if args.delay > 0:
                    time.sleep(args.delay)

    should_print = args.print_results or args.output is None
    if should_print:
        for idx, row in enumerate(all_rows, start=1):
            print("=" * 80)
            print(f"Item {idx}")
            if "title" in row:
                print(f"Title: {row.get('title', '')}")
                if "url" in row:
                    print(f"URL: {row.get('url', '')}")
                elif "href" in row:
                    print(f"URL: {row.get('href', '')}")
                if "word_count" in row:
                    print(f"Word count: {row.get('word_count')}")
                if "content" in row:
                    print("\nContent:")
                    print(row.get("content", ""))
            else:
                print(f"Text: {row.get('text', '')}")
                print(f"URL: {row.get('href', '')}")
            print()
        print("=" * 80)

    if args.output:
        if args.output.lower().endswith(".csv"):
            save_csv(args.output, all_rows)
        else:
            save_json(args.output, all_rows)
        print(f"Saved {len(all_rows)} records to {args.output}")
    else:
        print(f"Extracted {len(all_rows)} records")
        if auto_content_mode and not all_rows:
            print(
                "No readable article text found. The site is likely protected by anti-bot or requires login/cookies."
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
