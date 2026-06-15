# Quality Assurance: Test Cases for Research Workspace

This document outlines all the critical test cases to verify the functionality, stability, and security of the Research Workspace application.

## 1. Authentication & Routing
| Test ID | Scenario         | Steps                                                                                  | Expected Result                            |
| ---------| ------------------| ----------------------------------------------------------------------------------------| --------------------------------------------|
| AUTH-01 | User Login       | 1. Navigate to `/login`.<br>2. Enter valid credentials.<br>3. Click Login.             | Redirected to `/dashboard` successfully.   |
| AUTH-02 | Route Protection | 1. Open an incognito window.<br>2. Manually type URL `/dashboard` or `/workspace/123`. | Instantly redirected back to `/login`.     |
| AUTH-03 | User Logout      | 1. From Dashboard, click "Sign Out".                                                   | Session destroyed, redirected to `/login`. |

## 2. Dashboard Operations
| Test ID | Scenario          | Steps                                                                                    | Expected Result                                                                        |
| ---------| -------------------| ------------------------------------------------------------------------------------------| ----------------------------------------------------------------------------------------|
| DASH-01 | Create Note       | 1. Click "New Note".<br>2. Enter title "Test Note".                                      | Note is created in database, user is navigated to the Workspace for that note.         |
| DASH-02 | PDF Upload        | 1. Click "Upload PDF".<br>2. Select a valid PDF file.                                    | PDF is uploaded to Supabase Storage, entry created in `pdfs` table, and UI updates.    |
| DASH-03 | PDF Auto-Indexing | 1. Upload a PDF with text.<br>2. Check `pdf_pages` table in Supabase.                    | Text from all pages is automatically extracted and inserted into `pdf_pages`.          |
| DASH-04 | Legacy Indexing   | 1. Ensure a PDF exists in `pdfs` but not `pdf_pages`.<br>2. Click "Index Existing PDFs". | Button says "Processing...", extracts text, alerts success, and populates `pdf_pages`. |

## 3. Rich Text Editor (Workspace)
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| EDIT-01 | Basic Typing & Save | 1. Type text in Editor.<br>2. Wait 2 seconds. | Text is debounced and automatically saved to the Supabase `notes` table. |
| EDIT-02 | Reload Persistence | 1. Type text.<br>2. Wait for auto-save.<br>3. Refresh browser. | Editor reloads with the exact previously saved text. |
| EDIT-03 | Citation Rendering | 1. Open a note with an existing `[Cite]` token. | Token renders cleanly as a clickable pill button, not raw text. |

## 4. PDF Viewer Interaction
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| PDF-01 | Load PDF | 1. Select a PDF from the Workspace dropdown. | PDF loads securely via signed URL. |
| PDF-02 | Text Highlighting | 1. Select text in the PDF. | "Cite this selection" popup appears above cursor. |
| PDF-03 | Create Citation | 1. Click "Cite this selection". | A `[Cite]` token is instantly inserted into the Note Editor at the cursor position. |
| PDF-04 | Area Highlighting | 1. Hold `Alt` and drag a rectangle over an image/graph. | Area is highlighted, popup appears, citation can be created. |

## 5. Navigation & Deep Linking
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| NAV-01 | Same-PDF Jump | 1. Ensure PDF "A" is active.<br>2. Click a `[Cite]` token belonging to PDF "A". | PDF scrolls smoothly, centering the exact original highlight on the screen. Temporary yellow highlight appears for 3 seconds. |
| NAV-02 | Cross-PDF Jump | 1. Ensure PDF "A" is active.<br>2. Click a `[Cite]` token belonging to PDF "B". | Dropdown automatically changes to PDF "B", PDF "B" loads, jump is queued, and perfectly executes once loaded. |
| NAV-03 | Jump to Area | 1. Click a `[Cite]` token created via `Alt+Drag` (Area Selection). | PDF scrolls perfectly to the original rectangular bounding box. |

## 6. Global Search
| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| SRCH-01 | Debounce Input | 1. Type "grav" in search bar.<br>2. Wait 500ms. | Searches `pdf_pages`, shows "Searching...", returns results. |
| SRCH-02 | Result Formatting | 1. Search for a common word. | Dropdown shows exact word count, groups by page, and displays ~10 word snippets with the keyword visually highlighted. |
| SRCH-03 | Cross-PDF Search Click | 1. Search a word belonging to a closed PDF.<br>2. Click the result. | Active PDF switches to the target PDF, queues navigation. |
| SRCH-04 | Search Highlighting | 1. Click a search result.<br>2. Wait for page to render. | PDF scrolls to page, native Selection API identifies the exact word, wraps it in a glowing yellow box, centers screen, and clears box after 2.5s. |
| SRCH-05 | Fragmented Text Search | 1. Search for a word known to be split across spans (e.g. by kerning).<br>2. Click result. | Native `window.find()` robustly highlights it even if DOM nodes are fragmented. |
