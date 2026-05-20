# Android TTS App Requirements

This document captures the software requirements for an Android application that:

- Converts text to speech
- Extracts readable text from web pages
- Extracts readable text from PDF documents

## Project Goal

Build an Android-based TTS app that lets users import or extract text from supported sources, then listen to that content with a good reading experience.

## Confirmed Requirements

### Product Direction

- Target quality: production-ready app
- Delivery preference: polished version with all planned core functionality working
- Primary use case: general reading/listening productivity with offline reuse

### Supported Content Sources

- Web input methods:
  - pasted URL
  - Android sharesheet URL import from other apps
- PDF input methods:
  - local file picker only for version 1
- Content style:
  - extract clean readable text instead of preserving original visual formatting

### Web Extraction Requirements

- Extract only the main article/body text
- Ignore menus, ads, and unrelated page chrome where possible
- Save extracted web text locally for offline reuse
- When the same URL is opened again, reuse stored extracted content instead of re-fetching if cached content is available

### PDF Extraction Requirements

- Support both normal text PDFs and scanned/image PDFs
- Attempt native text extraction first
- Apply OCR only when required for scanned or image-based PDFs
- Use local file import in version 1

### Text-To-Speech Requirements

- Playback controls required:
  - start
  - stop
  - resume
  - fast forward by paragraph
- Voice requirements:
  - provide selectable free offline voices
  - support multilingual playback as much as device-installed offline engines allow
- Version 1 language target:
  - support the 10 most commonly used languages

### Offline, Storage, and History

- App should continue working offline after content has already been extracted/imported
- Extracted text should be saved into local history/library
- Previously processed URLs should be retrievable from local storage for future playback

## Working Assumptions Chosen For Planning

These were not explicitly fixed by the stakeholder, so they are being set as planning defaults:

- Tech stack: Kotlin + Jetpack Compose
- Architecture: MVVM + clean module boundaries
- Local database: Room
- Min SDK target: Android 8.0+ (`minSdk 26`) for a strong compatibility/maintainability balance
- Theme support: light and dark mode
- Public web pages only in version 1
- No user accounts or cloud sync in version 1
- Offline TTS uses Android-installed engines and voices; exact voice availability depends on device

## Proposed Version 1 Language Set

The app should prioritize these languages for detection, labeling, and voice selection:

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

Note:

- Actual offline voice availability will depend on what the user has installed on their device.
- The app should gracefully show unavailable languages/voices and guide the user to install missing offline voice data where possible.

## Functional Requirements Summary

1. User can paste a public web URL and extract the main readable article text.
2. User can share a URL from another Android app into this app for extraction.
3. User can pick a local PDF file and extract readable text.
4. App first attempts direct PDF text extraction, then falls back to OCR when text extraction is insufficient.
5. User can play, stop, resume, and jump forward by paragraph during playback.
6. User can choose from available free offline voices on the device.
7. App stores extracted text locally for offline reuse.
8. Reopening the same URL should prefer cached stored content when available.
9. App exposes a local history/library of previously extracted items.

## Non-Functional Requirements Summary

- Production-oriented code structure
- Reliable offline behavior after extraction/import
- Graceful handling of missing voices, OCR failure, and extraction failure
- Responsive UI for long documents/articles
- Privacy-first local storage approach

## Open Items Worth Confirming Later

- Final branding/app name
- Exact target Play Store readiness expectations
- Accessibility requirements beyond standard Android support
- Whether background playback notification controls are required in version 1

## Decision Log

- Status: Requirements captured and ready for implementation planning
