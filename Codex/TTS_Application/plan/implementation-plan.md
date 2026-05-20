# Android TTS App Implementation Plan

Status: Finalized from current stakeholder requirements

## Objective

Create an Android application that can:

- extract text from web pages
- extract text from PDF documents
- read extracted text aloud using text-to-speech

## Final Scope For Version 1

- Android app with polished UI and production-oriented architecture
- Web article extraction from:
  - pasted URL
  - Android sharesheet URL import
- PDF text extraction from:
  - local file picker
- Content handling:
  - main article/body text only for web pages
  - standard text extraction first for PDFs
  - OCR fallback for scanned/image PDFs when needed
- TTS:
  - start
  - stop
  - resume
  - jump forward by paragraph
  - offline multilingual voice selection from installed device voices
- Data:
  - local history/library
  - cached extracted content for repeat URLs
  - offline reuse after extraction/import

## Final Technical Baseline

- Language: Kotlin
- UI: Jetpack Compose + Material 3
- Architecture: MVVM + Repository pattern + use-case layer
- Dependency injection: Hilt
- Local storage: Room
- Networking / HTML fetch: OkHttp
- HTML parsing: Jsoup
- Readability extraction: custom cleaned extraction pipeline built on parsed HTML
- PDF text extraction: Android `PdfRenderer` support where relevant plus PDF parsing library
- OCR fallback: ML Kit Text Recognition or Tesseract-based on-device OCR evaluation
- TTS: Android `TextToSpeech` API with installed offline voices
- Background work: WorkManager for longer OCR or extraction jobs if needed

## Proposed Architecture

### App Layers

- `presentation`
  - Compose screens
  - view models
  - UI state
- `domain`
  - use cases
  - content models
  - playback models
- `data`
  - repositories
  - local database
  - remote fetch/extraction sources
  - PDF/OCR providers
- `platform`
  - TTS engine wrapper
  - share intent handler
  - file picker integration
  - language/voice discovery

### Core Feature Modules

- `feature-home`
- `feature-import-url`
- `feature-reader`
- `feature-history`
- `feature-settings`
- `core-tts`
- `core-webextract`
- `core-pdfextract`
- `core-ocr`
- `core-database`

## Screen Plan

### 1. Home Screen

- quick actions for paste URL and pick PDF
- recent items preview
- entry point for shared URLs

### 2. URL Import Flow

- paste URL field
- validate URL
- extract button
- loading / retry / cached-result states

### 3. PDF Import Flow

- Android document picker
- extraction progress
- OCR fallback messaging when needed

### 4. Reader / Player Screen

- extracted title/source
- scrollable text
- start / stop / resume controls
- jump forward by paragraph
- voice selection bottom sheet or dialog
- playback progress indicators

### 5. History / Library Screen

- saved extracted articles and PDFs
- source type markers
- searchable list
- reopen cached content
- delete local item

### 6. Settings Screen

- preferred language
- preferred voice
- offline voice availability status
- extraction/cache preferences
- OCR behavior preferences

## Data Model Plan

### Content Item

- `id`
- `sourceType` (`web` or `pdf`)
- `sourceKey` (normalized URL hash or PDF fingerprint)
- `title`
- `originalSource`
- `extractedText`
- `languageCode`
- `createdAt`
- `updatedAt`
- `lastReadPosition`
- `lastReadParagraphIndex`
- `ocrUsed`

### Voice Preference

- `id`
- `enginePackage`
- `voiceName`
- `localeTag`
- `isOfflinePreferred`

### Playback Session

- `contentItemId`
- `currentParagraphIndex`
- `isPlaying`
- `selectedVoice`

## Extraction Strategy

### Web Pages

1. Accept URL from manual input or Android sharesheet.
2. Normalize URL for cache lookup.
3. If cached extraction exists, load it immediately.
4. Otherwise fetch HTML.
5. Parse with Jsoup.
6. Remove scripts, nav, footer, ads, comments, and noisy blocks heuristically.
7. Extract the main readable article body.
8. Save normalized text and metadata locally.

### PDFs

1. Import PDF from local picker.
2. Attempt direct text extraction.
3. Measure extraction quality:
   - empty/near-empty text
   - low printable character ratio
   - suspicious page output
4. If quality is poor, switch to OCR flow.
5. Save extracted text, metadata, and OCR-used flag locally.

## TTS Strategy

- Enumerate installed `TextToSpeech` engines and available voices
- Filter for voices marked available and offline-capable where detectable
- Group voices by supported locale
- Let user choose among available voices
- Persist preferred voice per language when possible
- Track playback by paragraph index for resume and jump-forward actions

## Language Support Plan

Version 1 target languages:

- English
- Mandarin Chinese
- Spanish
- Hindi
- Arabic
- French
- Portuguese
- Bengali
- Russian
- Urdu

Implementation note:

- The app should support these languages at the UI/service level, but actual offline speech output depends on device-installed voice data.

## Delivery Phases

### Phase 1 - Project Bootstrap

- Create Android project
- Configure Gradle version catalog/dependencies
- Add Compose, Hilt, Room, navigation, testing
- Set up package/module structure

### Phase 2 - Persistence and Domain Models

- Define Room entities and DAOs
- Create repositories
- Implement content caching and history retrieval

### Phase 3 - Web Extraction

- URL input screen and validation
- share intent receiver flow
- HTML fetch + parse + clean article extraction
- cache-by-normalized-URL behavior

### Phase 4 - PDF Extraction and OCR

- file picker integration
- direct text extraction
- OCR fallback detection
- OCR execution and result cleaning

### Phase 5 - TTS Engine and Reader

- TTS wrapper
- voice discovery
- start/stop/resume/jump-paragraph controls
- reader screen integration

### Phase 6 - Settings and History

- library/history screen
- settings for voice/language/OCR behavior
- delete/reopen flows

### Phase 7 - Hardening

- error handling
- offline edge cases
- long-text performance tuning
- device voice availability messaging

### Phase 8 - Testing and Release Readiness

- unit tests for extraction, caching, and playback state
- instrumentation tests for import/playback flows
- accessibility pass
- release build configuration

## Risks and Mitigations

- Web pages vary heavily in structure
  - Mitigation: design extractor as a pipeline with test fixtures from multiple domains
- OCR can be slow on large scanned PDFs
  - Mitigation: run OCR per page with progress UI and cache results
- Offline voice support varies by device
  - Mitigation: build a clear voice availability screen and fallback guidance
- Very long documents may cause playback/UI lag
  - Mitigation: split content by paragraph and stream paragraph-level playback state

## Immediate Next Build Step

1. Scaffold the Android project with Kotlin, Compose, Hilt, Room, navigation, and baseline package structure.
2. Implement the domain/data foundation before the feature screens.
3. Build web extraction and PDF extraction in parallel after the core persistence layer is stable.
