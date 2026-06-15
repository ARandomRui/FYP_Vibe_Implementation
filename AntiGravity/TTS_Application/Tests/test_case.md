# Antigravity Android TTS - Test Cases

## 1. Core Text-to-Speech (TTS) Functionality
| Test Case ID | Feature | Steps to Execute | Expected Result |
|---|---|---|---|
| TC-01 | Speak Basic Text | 1. Enter text in input field.<br>2. Tap "Speak" button. | App reads the text aloud. Button changes to "Stop". |
| TC-02 | Stop and Resume | 1. Start speaking long text.<br>2. Tap "Stop".<br>3. Tap "Resume". | Speaking pauses on "Stop" and continues from where it left off on "Resume". |
| TC-03 | Skip to Next Sentence | 1. Start speaking a paragraph with multiple sentences.<br>2. Tap "Next". | App skips the current sentence and immediately begins reading the next sentence. |
| TC-04 | Clear Text | 1. Enter text in the field.<br>2. Tap "Clear" button. | The text field is emptied and a "Cleared" toast is shown. |
| TC-05 | Auto-detect Language | 1. Enter text in a foreign language (e.g., Spanish).<br>2. Observe the Voice Spinner. | The app auto-detects the language, switches the TTS voice to match, and shows the language in the UI. |
| TC-06 | Manual Voice Selection | 1. Open the Voice Spinner.<br>2. Select a different voice manually. | TTS engine updates to use the newly selected voice. The "Auto-Detect" label is hidden. |

## 2. Text Highlighting and Auto-Scrolling
| Test Case ID | Feature | Steps to Execute | Expected Result |
|---|---|---|---|
| TC-07 | Word/Sentence Highlighting | 1. Start speaking text.<br>2. Observe the text field. | The currently spoken chunk is highlighted in yellow. Highlight clears when done. |
| TC-08 | Auto-scrolling | 1. Paste text longer than the screen height.<br>2. Start speaking and wait. | The text field automatically scrolls down to keep the highlighted text in view. |

## 3. Handling Large Texts & Pagination
| Test Case ID | Feature | Steps to Execute | Expected Result |
|---|---|---|---|
| TC-09 | Pagination Split | 1. Paste text larger than 5000 characters. | App splits text into pages. Navigation buttons (Prev/Next) appear. |
| TC-10 | Next/Prev Page Navigation | 1. Load large text.<br>2. Tap "Next Page" and "Prev Page". | The text field updates to show the correct page chunk. Page indicator updates (e.g., "Page 1/3"). |
| TC-11 | Auto-advance Pages | 1. Start speaking near the end of Page 1.<br>2. Wait for it to finish. | App automatically flips to Page 2 and continues speaking seamlessly. |

## 4. File and Web Content Loading
| Test Case ID | Feature | Steps to Execute | Expected Result |
|---|---|---|---|
| TC-12 | Load PDF | 1. Tap "Load PDF".<br>2. Select a valid PDF file. | Text from the PDF is extracted and populated in the input field. |
| TC-13 | Load URL (Smart Scraper) | 1. Tap "Load URL".<br>2. Enter a blog post URL. | App fetches content via SmartScraper (Jsoup) and populates the text field. |
| TC-14 | Load URL (WebView Fallback) | 1. Tap "Load URL".<br>2. Enter a complex SPA/JavaScript-heavy URL. | Smart fetch may fail; fallback WebView loads invisibly, extracts text after 3 seconds, and populates the text field. |

## 5. Android System Integrations
| Test Case ID | Feature | Steps to Execute | Expected Result |
|---|---|---|---|
| TC-15 | Receive Shared Text | 1. Open a browser or notes app.<br>2. Highlight text and "Share" to the TTS App. | App opens, populates the shared text, and auto-detects language. |
| TC-16 | Receive Shared URL | 1. Share a URL (e.g., from Chrome) to the TTS App. | App detects the URL and automatically triggers the smart web fetch logic. |

## 6. History Management
| Test Case ID | Feature | Steps to Execute | Expected Result |
|---|---|---|---|
| TC-17 | Save to History | 1. Enter new text and tap "Speak".<br>2. Open Menu > History. | The newly spoken text is present in the history list. |
| TC-18 | Load from History | 1. Go to History.<br>2. Tap a previous entry. | History activity closes, and the main input field is populated with the selected text. |

## 7. Device Orientation & State
| Test Case ID | Feature | Steps to Execute | Expected Result |
|---|---|---|---|
| TC-19 | Rotation State Persistence | 1. Load text (with multiple pages).<br>2. Rotate device to Landscape. | Text remains. Current page index and speaking position are retained without restarting from the beginning. |
| TC-20 | Landscape Layout | 1. Rotate to Landscape with paginated text. | Voice controls are hidden to save space. Horizontal pagination controls appear. |
