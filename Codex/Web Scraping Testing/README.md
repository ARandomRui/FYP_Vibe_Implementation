# Python Web Scraper

A lightweight, configurable web scraper using `requests` + `BeautifulSoup`.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Basic usage

```bash
python scraper.py --url "https://example.com" --selector "a" --output links.json
```

## Paginated example

```bash
python scraper.py ^
  --url "https://quotes.toscrape.com" ^
  --selector ".quote" ^
  --next-selector "li.next a" ^
  --max-pages 3 ^
  --text-only ^
  --delay 1.0 ^
  --output quotes.csv
```

## Notes

- Respect website `robots.txt`, Terms of Service, and legal restrictions.
- Use reasonable delays to avoid overloading servers.
- Output format is based on extension: `.json` or `.csv`.
