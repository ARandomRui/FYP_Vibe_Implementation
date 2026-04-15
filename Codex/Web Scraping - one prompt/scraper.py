import argparse
import html
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from urllib.request import Request, urlopen

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

URLS_DEFAULT_FILE = "urls.txt"

NOISE_LINE_RE = re.compile(
    r"(^\s*(read more|also read|recommended|advertisement|sponsored|share this)\b)|"
    r"(^\s*list\s+\d+\s+of\s+\d+\b)|"
    r"(follow us on)|"
    r"(subscribe to)|"
    r"(click here)|"
    r"(^\s*our chief editor shares analysis)|"
    r"(^\s*an automated curation)|"
    r"(^\s*get our pick of top stories)|"
    r"(^\s*stay updated with notifications)|"
    r"(^\s*join our channel)",
    re.IGNORECASE,
)

SCRIPT_JSONLD_RE = re.compile(
    r"<script[^>]*type=[\"']application/ld\+json[\"'][^>]*>(.*?)</script>",
    re.IGNORECASE | re.DOTALL,
)

META_OG_TITLE_RE = re.compile(
    r"<meta[^>]*property=[\"']og:title[\"'][^>]*content=[\"'](.*?)[\"'][^>]*>",
    re.IGNORECASE | re.DOTALL,
)

TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)

SCRIPT_STYLE_RE = re.compile(
    r"<(script|style|noscript|iframe|svg)[^>]*>.*?</\1>",
    re.IGNORECASE | re.DOTALL,
)
HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)
TAG_RE = re.compile(r"<[^>]+>")

ARTICLE_BLOCK_RE = re.compile(r"<article\b[^>]*>(.*?)</article>", re.IGNORECASE | re.DOTALL)
MAIN_BLOCK_RE = re.compile(r"<main\b[^>]*>(.*?)</main>", re.IGNORECASE | re.DOTALL)
HINT_BLOCK_RE = re.compile(
    r"<(div|section)\b[^>]*(class|id)\s*=\s*['\"][^'\"]*(article|story|post|entry|wysiwyg|body|content)[^'\"]*['\"][^>]*>(.*?)</\1>",
    re.IGNORECASE | re.DOTALL,
)
TEXT_BLOCK_RE = re.compile(
    r"<(p|h1|h2|h3|li|blockquote)\b[^>]*>(.*?)</\1>",
    re.IGNORECASE | re.DOTALL,
)
META_CHARSET_RE = re.compile(rb"<meta[^>]+charset=['\"]?\s*([a-zA-Z0-9._-]+)", re.IGNORECASE)
BH_BODY_INLINE_RE = re.compile(r'"body_with_inline":"((?:\\.|[^"\\])*)"', re.DOTALL)


@dataclass
class ScrapeResult:
    url: str
    domain: str
    title: str
    content: str
    method: str


def normalize_domain(url: str) -> str:
    netloc = urlparse(url).netloc.lower()
    return netloc[4:] if netloc.startswith("www.") else netloc


def clean_text(text: str) -> str:
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text or "").strip()
    return text


def load_json_objects(raw: str) -> list[dict[str, Any]]:
    raw = clean_text(raw)
    if not raw:
        return []
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError:
        return []

    if isinstance(obj, dict):
        out = [obj]
        graph = obj.get("@graph")
        if isinstance(graph, list):
            out.extend([x for x in graph if isinstance(x, dict)])
        return out

    if isinstance(obj, list):
        return [x for x in obj if isinstance(x, dict)]

    return []


def deep_find_article_body(obj: Any) -> list[str]:
    found: list[str] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "articleBody" and isinstance(v, str):
                t = clean_text(v)
                if t:
                    found.append(t)
            else:
                found.extend(deep_find_article_body(v))
    elif isinstance(obj, list):
        for item in obj:
            found.extend(deep_find_article_body(item))
    return found


def extract_json_ld_content(html_text: str) -> str:
    candidates: list[str] = []
    for script_content in SCRIPT_JSONLD_RE.findall(html_text):
        for obj in load_json_objects(script_content):
            candidates.extend(deep_find_article_body(obj))

    candidates = [c for c in candidates if len(c) > 200]
    if not candidates:
        return ""

    return max(candidates, key=len)


def extract_title(html_text: str) -> str:
    og = META_OG_TITLE_RE.search(html_text)
    if og:
        return clean_text(og.group(1))

    t = TITLE_RE.search(html_text)
    if t:
        return clean_text(t.group(1))

    return ""


def strip_non_content_html(html_text: str) -> str:
    cleaned = SCRIPT_STYLE_RE.sub(" ", html_text)
    cleaned = HTML_COMMENT_RE.sub(" ", cleaned)
    return cleaned


def strip_tags(fragment: str) -> str:
    return clean_text(TAG_RE.sub(" ", fragment))


def looks_like_code(line: str) -> bool:
    if not line:
        return True
    token_hits = sum(x in line for x in ("function(", "var ", "const ", "let ", "=>", "{", "}", ";"))
    punct_ratio = sum(1 for c in line if c in "{};=<>[]()") / max(len(line), 1)
    return token_hits >= 2 or punct_ratio > 0.08


def extract_lines_from_block(block_html: str) -> list[str]:
    lines: list[str] = []
    for _, inner in TEXT_BLOCK_RE.findall(block_html):
        line = strip_tags(inner)
        if len(line) < 30:
            continue
        if NOISE_LINE_RE.search(line):
            continue
        if looks_like_code(line):
            continue
        lines.append(line)
    return lines


def pick_blocks(cleaned_html: str) -> list[str]:
    blocks = [m for m in ARTICLE_BLOCK_RE.findall(cleaned_html)]
    if blocks:
        return blocks

    blocks = [m for m in MAIN_BLOCK_RE.findall(cleaned_html)]
    if blocks:
        return blocks

    hinted = [m[3] for m in HINT_BLOCK_RE.findall(cleaned_html)]
    if hinted:
        return hinted

    return [cleaned_html]


def extract_dom_content(html_text: str) -> str:
    cleaned = strip_non_content_html(html_text)
    blocks = pick_blocks(cleaned)

    lines: list[str] = []
    seen: set[str] = set()
    for block in blocks:
        for line in extract_lines_from_block(block):
            if line in seen:
                continue
            seen.add(line)
            lines.append(line)
        if sum(len(x) for x in lines) > 800:
            break

    return "\n".join(lines).strip()


def extract_bharian_inline_body(html_text: str) -> str:
    m = BH_BODY_INLINE_RE.search(html_text)
    if not m:
        m = BH_BODY_INLINE_RE.search(html.unescape(html_text))
    if not m:
        return ""
    try:
        html_fragment = json.loads(f"\"{m.group(1)}\"")
    except Exception:
        return ""
    html_fragment = html.unescape(html_fragment)
    lines = extract_lines_from_block(html_fragment)
    if lines:
        return "\n".join(lines)
    return strip_tags(html_fragment)


def fetch_msn_api_content(url: str) -> tuple[str, str]:
    id_match = re.search(r"/ar-([A-Za-z0-9]+)", url)
    market_match = re.search(r"/([a-z]{2}-[a-z]{2})/", url, re.IGNORECASE)
    if not id_match:
        return "", ""
    market = (market_match.group(1).lower() if market_match else "en-us")
    api_url = f"https://assets.msn.com/content/view/v2/Detail/{market}/{id_match.group(1)}"
    req = Request(api_url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urlopen(req, timeout=30) as resp:
        payload = json.loads(resp.read().decode("utf-8", errors="replace"))

    body_html = payload.get("body", "")
    title = clean_text(payload.get("title", ""))
    lines = extract_lines_from_block(body_html)
    if not lines:
        plain = strip_tags(body_html)
        if plain:
            lines = [plain]

    abstract = clean_text(payload.get("abstract", ""))
    if abstract and (not lines or abstract not in lines[0]):
        lines.insert(0, abstract)

    return title, "\n".join(lines).strip()


def detect_charset(raw: bytes, header_charset: str | None) -> str:
    if raw.startswith(b"\xef\xbb\xbf"):
        return "utf-8-sig"
    if raw.startswith(b"\xff\xfe") or raw.startswith(b"\xfe\xff"):
        return "utf-16"
    m = META_CHARSET_RE.search(raw[:4096])
    if m:
        try:
            return m.group(1).decode("ascii", errors="ignore").lower()
        except Exception:
            pass
    if header_charset:
        return header_charset.lower()
    return "utf-8"


def text_quality_score(text: str) -> int:
    bad_markers = ("Ã", "â", "Ø", "Ù", "Ð", "Ñ", "�")
    score = sum(text.count(ch) for ch in bad_markers)
    score += sum(ord(ch) < 9 or (13 < ord(ch) < 32) for ch in text)
    return score


def get_html(url: str, timeout: int = 30) -> str:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
        meta_or_header = detect_charset(raw, resp.headers.get_content_charset())
        header_charset = (resp.headers.get_content_charset() or "").lower()
        candidates = [
            meta_or_header,
            "utf-8",
            "utf-8-sig",
            header_charset,
            "utf-16",
            "gb18030",
            "big5",
            "windows-1256",
            "windows-1252",
            "latin-1",
        ]
        tried: list[str] = []
        decoded_candidates: list[tuple[int, str]] = []
        for enc in candidates:
            if not enc or enc in tried:
                continue
            tried.append(enc)
            try:
                text = raw.decode(enc, errors="strict")
                decoded_candidates.append((text_quality_score(text), text))
            except Exception:
                continue
        if decoded_candidates:
            decoded_candidates.sort(key=lambda x: x[0])
            return decoded_candidates[0][1]
        return raw.decode(meta_or_header or "utf-8", errors="replace")


def scrape_url(url: str) -> ScrapeResult:
    html_text = get_html(url)
    domain = normalize_domain(url)
    title = extract_title(html_text)

    content = extract_json_ld_content(html_text)
    if content:
        method = "json-ld:articleBody"
    else:
        if domain == "bharian.com.my":
            content = extract_bharian_inline_body(html_text)
            method = "bharian:body_with_inline"
        elif domain == "msn.com":
            api_title, api_content = fetch_msn_api_content(url)
            if api_title:
                title = api_title
            content = api_content
            method = "msn:content-api-v2"
        else:
            content = ""
            method = "dom-heuristic"

        if not content:
            content = extract_dom_content(html_text)
            method = "dom-heuristic"

    if not content:
        raise RuntimeError("No article content extracted")

    return ScrapeResult(
        url=url,
        domain=domain,
        title=title,
        content=content,
        method=method,
    )


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Scrape clean article content from news URLs (without ads/suggestions)."
    )
    p.add_argument(
        "--urls-file",
        type=Path,
        default=Path(URLS_DEFAULT_FILE),
        help="Text file with one URL per line (default: urls.txt).",
    )
    p.add_argument(
        "--url",
        action="append",
        default=[],
        help="Single URL. Use multiple times for multiple URLs.",
    )
    p.add_argument(
        "--out",
        type=Path,
        default=Path("scraped_articles.json"),
        help="Output JSON file path.",
    )
    return p.parse_args()


def read_urls(args: argparse.Namespace) -> list[str]:
    urls: list[str] = []
    if args.urls_file and args.urls_file.exists():
        for line in args.urls_file.read_text(encoding="utf-8").splitlines():
            line = line.strip().lstrip("\ufeff")
            if line and not line.startswith("#"):
                urls.append(line)

    urls.extend(args.url)

    deduped: list[str] = []
    seen: set[str] = set()
    for u in urls:
        u = u.lstrip("\ufeff")
        if u not in seen:
            seen.add(u)
            deduped.append(u)

    if not deduped:
        raise ValueError("No URLs supplied. Add URLs to urls.txt or pass --url.")

    return deduped


def main() -> int:
    args = parse_args()
    try:
        urls = read_urls(args)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 2

    results: list[ScrapeResult] = []
    for url in urls:
        try:
            result = scrape_url(url)
            results.append(result)
            print(f"OK: {url} [{result.method}]")
        except Exception as e:
            print(f"FAIL: {url} -> {e}", file=sys.stderr)

    args.out.write_text(
        json.dumps([asdict(r) for r in results], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Saved {len(results)} article(s) to {args.out}")

    return 0 if results else 1


if __name__ == "__main__":
    raise SystemExit(main())
