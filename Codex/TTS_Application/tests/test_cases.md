# ScribeSpeak Test Cases

## Purpose

This document defines comprehensive manual test cases for the current `ScribeSpeak` Android application implementation.

It covers:

- App launch and navigation
- Web article import
- Shared URL import
- PDF import
- Reader and text-to-speech playback
- Library/history behavior
- Settings behavior
- Persistence, offline reuse, and failure handling

It also includes a small number of clearly labeled future-scope checks for features that are planned in requirements but not fully implemented yet.

## Current Product Scope

Based on the current codebase, the app currently supports:

- Importing public web article URLs
- Importing PDF files with embedded text
- Caching imported content locally
- Opening saved content from Home and Library
- Reader playback controls:
  - Play
  - Stop
  - Resume
  - Restart
  - Next paragraph
- Auto language detection for playback
- Manual language override in Settings
- URL intake from paste, `ACTION_SEND`, and `ACTION_VIEW`

Known current limitations:

- OCR fallback for scanned/image PDFs is not implemented yet
- Library search is not implemented yet
- Library delete is not implemented yet
- Voice picker UI is not implemented; playback depends on device TTS availability

## Test Environment

- Platform: Android device or emulator
- Android version: Android 8.0+ (`minSdk 26`)
- Network: both online and offline scenarios
- Device setup:
  - Android text-to-speech enabled
  - At least one offline voice installed
  - At least one PDF with embedded text available
  - At least one scanned/image-only PDF available for negative testing

## Suggested Test Data

Prepare the following before execution:

- `URL-01`: A public article page with readable body text
- `URL-02`: A second public article page from a different site/layout
- `URL-03`: A paywalled or teaser-only article
- `URL-04`: An invalid URL string
- `URL-05`: A URL without scheme, for example `example.com/story`
- `PDF-01`: Text-based PDF with more than 80 characters of embedded text
- `PDF-02`: Another text-based PDF with a different filename/content
- `PDF-03`: Scanned or image-only PDF with little or no embedded text
- `PDF-04`: Corrupted or unreadable PDF file
- `TEXT-01`: Shared plain text containing a valid URL plus extra surrounding text
- `TEXT-02`: Shared plain text with no URL

## Priority Legend

- `P0`: Critical path
- `P1`: High value
- `P2`: Important edge case
- `P3`: Nice-to-have or future-scope

## Test Cases

| ID | Priority | Area | Preconditions | Steps | Expected Result |
|---|---|---|---|---|---|
| TC-001 | P0 | Launch | App installed | Launch the app from launcher | App opens successfully to Home screen with bottom navigation visible |
| TC-002 | P1 | Launch | Fresh install with empty database | Open app for first time | Home screen shows `Saved Items = 0` and empty recent-library state |
| TC-003 | P1 | Navigation | App on Home | Tap `Import content` chip | App navigates to Import screen |
| TC-004 | P1 | Navigation | App on Home | Tap `Open library` chip | App navigates to Library screen |
| TC-005 | P1 | Navigation | App on any bottom-bar screen | Tap each bottom nav item: Home, Import, Library, Settings | Correct screen opens and selection state updates correctly |
| TC-006 | P2 | Navigation | Reader is open | Verify bottom bar visibility | Reader screen is reachable, but is not shown as a bottom-bar destination |
| TC-007 | P1 | Home | Database contains imported items | Return to Home screen | `Saved Items` count reflects library size and recent items list is populated |
| TC-008 | P1 | Home | At least one recent item exists | Tap a recent item card | Reader opens for the tapped content item |
| TC-009 | P0 | URL Import | On Import screen, device online, `URL-01` available | Paste `URL-01` and tap `Extract Article` | Loading state appears, article imports successfully, result card is shown, then Reader opens automatically |
| TC-010 | P0 | URL Import | On Import screen, device online, `URL-05` available | Enter URL without scheme and import | URL is normalized to HTTPS and import succeeds if page is valid |
| TC-011 | P1 | URL Import | On Import screen | Enter blank input and tap `Extract Article` | Error card appears with invalid URL messaging |
| TC-012 | P1 | URL Import | On Import screen | Enter `URL-04` such as malformed text and import | Error card appears with `Invalid URL` title and helpful message |
| TC-013 | P1 | URL Import | On Import screen | Enter unsupported scheme such as `ftp://example.com/file` | Import is rejected with invalid URL messaging |
| TC-014 | P0 | URL Import | On Import screen, device online, `URL-03` available | Import paywalled or teaser-only article | App shows paywall/article-unavailable error instead of saving bad content |
| TC-015 | P1 | URL Import | On Import screen, device offline | Import a new uncached web article | Import fails gracefully with an error message and app does not crash |
| TC-016 | P0 | URL Cache | `URL-01` already imported once | Import the same URL again | Cached content is reused, result card indicates cached load, duplicate content is not created unnecessarily |
| TC-017 | P1 | URL Cache | `URL-01` already imported, device offline | Re-import the same URL while offline | Cached article opens successfully without network fetch |
| TC-018 | P1 | URL Import | On Import screen, device online, `URL-02` available | Import a second valid article from a different site layout | Extraction succeeds and saved content matches the second source |
| TC-019 | P2 | URL Import | On Import screen | Paste URL with uppercase host or extra spaces and import | URL is trimmed and normalized; import still succeeds if page is valid |
| TC-020 | P2 | URL Import | App just imported one shared URL successfully | Send the same shared URL again without changing content | App should avoid duplicate re-processing when the previous result is already loaded |
| TC-021 | P0 | Share Intent | App installed, source app available, `TEXT-01` prepared | Share plain text containing a valid URL to ScribeSpeak | App opens Import flow, extracts first URL found, and opens Reader on success |
| TC-022 | P1 | Share Intent | Browser or other app can open web links, `URL-01` available | Open HTTP/HTTPS link with ScribeSpeak via `VIEW` intent | App receives the link and routes user into Import flow automatically |
| TC-023 | P2 | Share Intent | Source app available, `TEXT-02` prepared | Share plain text with no URL to ScribeSpeak | No valid import occurs; app remains stable and does not crash |
| TC-024 | P0 | PDF Import | On Import screen, `PDF-01` available | Tap `Pick PDF` and select `PDF-01` | PDF imports successfully, preview/result card appears, Reader opens automatically |
| TC-025 | P0 | PDF Cache | `PDF-01` already imported | Import `PDF-01` again | Cached result is reused instead of creating a new duplicate import |
| TC-026 | P1 | PDF Import | On Import screen, `PDF-02` available | Import a different text-based PDF | Import succeeds and a separate library item is created |
| TC-027 | P0 | PDF Negative | On Import screen, `PDF-03` available | Import scanned/image-only PDF | Import fails gracefully with message indicating embedded text is insufficient and OCR is not yet wired |
| TC-028 | P1 | PDF Negative | On Import screen, `PDF-04` available | Import corrupted or unreadable PDF | Import fails gracefully with `PDF import failed` messaging and app does not crash |
| TC-029 | P2 | PDF Metadata | `PDF-01` imported | Open imported PDF item in Reader or Library | Title/original source shows the PDF display name when available |
| TC-030 | P0 | Library | At least one imported item exists | Open Library tab | Library displays saved items with source type label, title, source, and preview text |
| TC-031 | P1 | Library | Library contains both web and PDF items | Inspect list order and content | Items appear in a usable recent-first style and each card opens the correct content |
| TC-032 | P0 | Library | At least one library item exists | Tap a Library item card | Reader opens for the selected content |
| TC-033 | P1 | Library Persistence | Import content, close app fully, relaunch | Return to Home and Library | Saved items remain available after app restart |
| TC-034 | P0 | Reader Load | Reader opened from imported content | Observe screen content | Reader shows title, source, paragraph cards, playback panel, and back button |
| TC-035 | P0 | Reader Playback | Reader loaded, TTS engine available, content has paragraphs | Tap `Play` | Playback starts, status message updates, active paragraph is highlighted |
| TC-036 | P0 | Reader Playback | Playback is active | Tap `Stop` | Playback stops and reader enters paused state |
| TC-037 | P0 | Reader Playback | Playback was stopped from active reading | Tap `Play` or `Resume` behavior path | Playback resumes from current paragraph rather than restarting unexpectedly |
| TC-038 | P1 | Reader Playback | Reader loaded with multi-paragraph article | Tap `Next paragraph` while idle | Current paragraph index advances by one and progress is saved |
| TC-039 | P1 | Reader Playback | Playback active on a multi-paragraph article | Tap `Next paragraph` during playback | Current speech stops and playback restarts from next paragraph |
| TC-040 | P1 | Reader Playback | Reader progressed beyond paragraph 1 | Tap `Restart` | Reader returns to paragraph 1 and marks restart state correctly |
| TC-041 | P1 | Reader Playback | Reader on last paragraph | Tap `Next paragraph` | No out-of-range crash occurs; button should effectively do nothing at the end |
| TC-042 | P1 | Reader Playback | Reader with content too short to form readable paragraphs | Tap `Play` | Reader shows friendly error about insufficient extracted text |
| TC-043 | P1 | Reader TTS | Reader opened on device with working TTS | Observe initial status during load | UI shows TTS initialization state, then becomes ready without crashing |
| TC-044 | P1 | Reader TTS | Reader on device with TTS disabled, broken, or unavailable | Open Reader and try playback | User sees clear TTS-unavailable messaging and app remains stable |
| TC-045 | P1 | Reader TTS | Content language differs from device default, auto-detect enabled, matching voice installed | Play content | App attempts playback in detected content language |
| TC-046 | P2 | Reader TTS | Content language unsupported locally | Play content | App falls back to device default language if possible; if not, clear error is shown |
| TC-047 | P1 | Reader Progress | Play or skip forward several paragraphs, leave Reader, reopen same item | Reopen item from Library/Home | Reader resumes from saved paragraph index |
| TC-048 | P1 | Reader Auto Follow | Playback active | Observe paragraph list during playback | Active paragraph scrolls into view automatically while auto follow is enabled |
| TC-049 | P2 | Reader Auto Follow | Playback active and auto follow enabled | Manually tap or drag inside the reader area | Auto follow is disabled and UI reflects the off state |
| TC-050 | P2 | Reader Auto Follow | Auto follow currently off | Tap auto-follow toggle | Auto follow is re-enabled |
| TC-051 | P1 | Reader Layout | Open Reader in portrait mode | Verify layout | Header, playback panel, errors, and paragraph list are readable and usable |
| TC-052 | P1 | Reader Layout | Open Reader in landscape mode | Verify layout | Two-column layout is usable and no major clipping/overlap occurs |
| TC-053 | P0 | Settings | Open Settings screen | Inspect default state | `Auto detect language` is enabled by default and supported language list is shown |
| TC-054 | P1 | Settings | On Settings | Turn off `Auto detect language` | Manual language radio buttons become effectively selectable |
| TC-055 | P1 | Settings | Auto detect disabled | Select a manual language | Preference is stored and remains selected after leaving and reopening Settings |
| TC-056 | P1 | Settings | Manual language selected | Re-enable `Auto detect language` | Auto-detect is turned back on and reader should prioritize content-language detection |
| TC-057 | P1 | Settings Persistence | Change settings, close app, relaunch | Reopen Settings | Updated settings persist across restarts |
| TC-058 | P1 | Data Integrity | Import one web article and one PDF | Check Home, Library, Reader | Correct source labels are shown: `Web page` or `PDF document` |
| TC-059 | P2 | Data Integrity | Import content and reopen later | Check text preview and reader body | Extracted text remains intact and not unexpectedly blank/truncated beyond intended preview cards |
| TC-060 | P2 | Error Handling | Trigger any import error | After error, try another valid import | Error state clears correctly and valid import can proceed normally |
| TC-061 | P2 | Stability | Repeatedly switch between bottom-bar tabs | Stress basic navigation | No crash, duplicated screens, or broken navigation state occurs |
| TC-062 | P2 | Stability | Import screen loading state active | Attempt rapid repeat taps on import buttons | Buttons stay disabled while loading and duplicate actions are avoided |
| TC-063 | P2 | Accessibility | Use larger font size / display size | Navigate Home, Import, Reader, Settings | Core controls remain visible and usable without severe overlap |
| TC-064 | P2 | Accessibility | Screen reader enabled if available | Focus through buttons and key controls | Controls expose understandable labels such as Play, Stop, Restart, Next paragraph, and back navigation |
| TC-065 | P2 | Offline Reuse | Import valid content while online, then disable network | Open saved items from Home and Library | Previously saved content remains accessible offline |
| TC-066 | P3 | Future Scope | Scanned PDF plus OCR feature becomes implemented in future | Import scanned/image-only PDF | Expected future behavior: OCR fallback extracts readable text and saves content |
| TC-067 | P3 | Future Scope | Search feature becomes implemented in future | Search by title/source text in Library | Expected future behavior: matching items can be filtered and opened |
| TC-068 | P3 | Future Scope | Delete feature becomes implemented in future | Delete a saved item from Library | Expected future behavior: item is removed from Home recent list, Library, and cache references |

## Recommended Smoke Suite

Run these first after each major build:

1. `TC-001` Launch app
2. `TC-003` Navigate to Import
3. `TC-009` Import valid web article
4. `TC-024` Import valid PDF
5. `TC-030` Open Library
6. `TC-035` Start playback
7. `TC-036` Stop playback
8. `TC-053` Open Settings and verify defaults
9. `TC-057` Confirm settings persistence
10. `TC-065` Verify offline reuse of saved content

## Recommended Regression Suite

Run this suite before release:

- All `P0` cases
- All import failure cases: `TC-014`, `TC-015`, `TC-027`, `TC-028`, `TC-060`
- Progress and persistence cases: `TC-033`, `TC-047`, `TC-057`, `TC-065`
- Layout cases: `TC-051`, `TC-052`

## Notes

- The document intentionally separates current functionality from future-scope checks.
- If OCR, delete, search, or voice-selection UI are added later, this file should be extended rather than replaced.
- If the team wants, this manual suite can be converted into instrumentation and unit-test tickets next.
