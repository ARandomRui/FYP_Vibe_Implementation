# Test Cases

## Scope

This document covers manual test cases for the `Online PDF Viewer` app in this repository. The focus is on the currently implemented flows: setup, authentication, workspace management, PDF upload/viewing, note editing, citations, PDF search, and basic access control expectations.

## Preconditions

- Run the frontend from `Online PDF Viewer`.
- Apply the Supabase schema from [schema.sql](/abs/path/c:/Users/Home/Desktop/FYP_Vibe_Implementation/Codex/PDFWebsite/Online PDF Viewer/supabase/schema.sql).
- Prepare two test users:
  - `user_a`
  - `user_b`
- Prepare at least two searchable PDF files:
  - `sample-a.pdf` containing a unique phrase such as `alpha reference phrase`
  - `sample-b.pdf` containing a unique phrase such as `beta search phrase`

## Test Cases

| ID | Area | Scenario | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| TC-01 | Setup | App shows setup notice when Supabase env vars are missing | 1. Remove or blank `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. 2. Start the app. | The setup screen appears with instructions to configure `.env`. |
| TC-02 | Setup | App loads auth screen when Supabase is configured | 1. Add valid Supabase env vars. 2. Start the app. | The sign-in screen appears instead of the setup notice. |
| TC-03 | Auth | User can create an account | 1. Open the auth screen. 2. Switch to sign-up mode. 3. Enter a new email and password with at least 6 characters. 4. Submit. | Account creation succeeds. A confirmation message is shown if sign-up completes. |
| TC-04 | Auth | User cannot sign in with invalid credentials | 1. Stay on sign-in mode. 2. Enter an incorrect password. 3. Submit. | Sign-in fails and an auth error message is displayed. |
| TC-05 | Auth | Signed-in user can sign out | 1. Sign in with a valid account. 2. Click `Sign out`. | The session is cleared and the app returns to the auth screen. |
| TC-06 | Workspace | User can create a new workspace | 1. Sign in. 2. Open the `Workspace` modal. 3. Click `New`. | A new workspace is created, selected automatically, and shows the default title `Untitled workspace`. |
| TC-07 | Workspace | User can rename a workspace | 1. Open the `Workspace` modal. 2. Click `Rename` on a workspace. 3. Enter a new name. 4. Click `Save`. | The workspace title updates in the modal and remains selected if it was the active workspace. |
| TC-08 | Workspace | Workspace note autosaves after editing | 1. Open a workspace. 2. Type text into the note editor. 3. Wait at least 1 second. 4. Refresh the page or sign out and back in. | The save indicator returns to `Saved`, and the edited note content is still present after reload. |
| TC-09 | Editor | Rich text formatting buttons apply formatting | 1. Enter note text. 2. Select part of the text. 3. Apply `H1`, `H2`, `Bold`, `Italic`, and `Body` in separate checks. | The note content updates visually and remains saved after reload. |
| TC-10 | Documents | Empty workspace shows upload guidance | 1. Open a workspace with no linked PDFs. | The documents panel shows the empty-state message prompting the user to upload PDFs. |
| TC-11 | Documents | User can upload a PDF to the current workspace | 1. Open a workspace. 2. Click `Upload`. 3. Select `sample-a.pdf`. | Upload succeeds, the document appears in the PDF list, becomes selected, and opens in the viewer. |
| TC-12 | Documents | User can upload multiple PDFs and switch between them | 1. Upload `sample-a.pdf` and `sample-b.pdf`. 2. Click each document row in turn. | Both documents appear in the list and the viewer switches to the selected PDF each time. |
| TC-13 | Viewer | Viewer shows a loading state and page count | 1. Open any uploaded PDF. | The viewer shows `Loading document...` while rendering, then displays the document title and a page count. |
| TC-14 | Citation | `Cite` button stays disabled when no valid PDF text is selected | 1. Open a workspace and PDF. 2. Do not select text in the PDF. | The `Cite` button remains disabled. |
| TC-15 | Citation | User can create a citation from selected PDF text | 1. Select text in an opened PDF. 2. Click `Cite`. | A citation chip such as `[1]` is inserted into the note, the citation is stored, and the selected-text pending state clears. |
| TC-16 | Citation | Clicking a citation chip jumps back to the cited PDF location | 1. Create a citation in the note. 2. Scroll away or switch pages if possible. 3. Click the citation chip in the note. | The app opens the linked document, scrolls to the cited area, and re-highlights the cited selection. |
| TC-17 | Citation | Deleting a citation chip from the note removes the citation record | 1. Create a citation. 2. Delete the citation chip from the note content. 3. Wait for autosave. 4. Refresh the page. | The deleted citation chip does not return after reload, and clicking old note content cannot reopen that citation. |
| TC-18 | Search | Search modal guides the user when no workspace or PDFs are available | 1. Open PDF search in a state with no linked PDFs in the workspace. | The modal shows a helpful empty-state message instead of results. |
| TC-19 | Search | Search finds text across linked PDFs | 1. Upload PDFs containing unique phrases. 2. Open PDF search. 3. Search for a known phrase from one PDF. | Matching results are shown with document title, page number, file name, and a snippet with highlighted search text. |
| TC-20 | Search | Opening a search result jumps to the correct page | 1. Run a search with at least one result. 2. Click a result row. | The search modal closes, the correct PDF opens, the viewer scrolls to the matching page, and the found terms are highlighted on that page. |
| TC-21 | Search | Search shows no-results feedback for missing text | 1. Search for a phrase that does not exist in any linked PDF. | The modal shows `No matches found in this workspace.` |
| TC-22 | Access Control | Users only see their own workspaces and documents | 1. Sign in as `user_a` and create workspaces and uploads. 2. Sign out. 3. Sign in as `user_b`. | `user_b` does not see `user_a` workspaces, documents, or citations in the UI. |
| TC-23 | Session | Signing out clears workspace-specific UI state | 1. Sign in and open a workspace, document, and search modal. 2. Sign out. 3. Sign back in. | The previous session state is cleared and the app reloads data fresh for the new session. |

## Notes

- These are manual functional test cases, not automated tests.
- Citation numbering is currently expected to increase in creation order within a workspace.
- Browser behavior around PDF text selection can vary slightly, so citation tests should be run in at least one primary supported browser.
