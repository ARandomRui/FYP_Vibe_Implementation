# PDF Viewer + Note-Taking App Implementation Plan

## Project Goal

Build a web application that lets users:

- Create accounts and log in
- Upload and view their own PDF documents in the browser
- Create and manage private workspaces
- Keep one rich-text note inside each workspace
- Select text from the PDF and cite it inside the workspace note
- Click a citation in a workspace note to jump back to the cited PDF section
- Re-highlight the original cited text when navigating back
- Store all application data in Supabase

## Core Requirements Collected So Far

### Functional Requirements

1. Users can create accounts and log in.
2. Users can upload and read their own PDF files in a web interface.
3. Users can create private workspaces while reading PDFs.
4. Each workspace contains one note with basic rich text formatting, including headings, bold, and italics.
5. A single workspace can reference multiple PDFs.
6. Users can select part of a PDF and create a citation from that selection.
7. Citations appear inside workspace notes as styled clickable buttons such as `[1]`.
8. Clicking a citation navigates the PDF viewer back to the original cited section.
9. The original cited text is highlighted again when revisited.
10. Users can delete citations, but cannot directly edit them. To change one, they must delete and recreate it.
11. The application is desktop-first.
12. All persistent data is stored in Supabase.

### Key User Flow

1. User logs in.
2. User opens a workspace.
3. User uploads or opens one of their PDFs.
4. User highlights text in the PDF.
5. User clicks a `Cite` action.
6. The system creates a citation record tied to the selected PDF region/text.
7. The citation is inserted into the workspace note as a styled clickable reference.
8. The workspace note is autosaved to Supabase.
9. When the reference is clicked later, the viewer opens the correct PDF, returns to that location, and highlights it again.

## Proposed Technical Direction

### Frontend

- Single-page web app
- PDF rendering with `pdf.js`
- Rich text editor for the workspace note
- Split desktop layout:
  - Main panel: PDF viewer
  - Side panel: workspace note editor
  - Document switcher or library panel for selecting among PDFs attached to the workspace

### Backend / Data

- Supabase Auth for user accounts
- Supabase Postgres for structured data
- Supabase Storage for uploaded PDF files

### Citation Strategy

Each citation should store enough information to relocate the cited content later. A practical first version would store:

- `workspace_id`
- `document_id`
- selected text
- page number
- approximate bounding box coordinates on the page
- quote index/reference number within the workspace
- text layer anchor data if available from the PDF renderer

This allows the app to:

- open the correct PDF for the citation
- jump back to the correct page
- re-highlight the cited range
- keep citation numbering stable within a workspace

## Suggested Data Model

### `profiles`

- `id`
- `email`
- `created_at`

### `documents`

- `id`
- `user_id`
- `title`
- `file_path`
- `file_name`
- `created_at`

### `workspaces`

- `id`
- `user_id`
- `title`
- `note_content_html`
- `created_at`
- `updated_at`

### `workspace_documents`

- `id`
- `workspace_id`
- `document_id`
- `created_at`

### `citations`

- `id`
- `workspace_id`
- `document_id`
- `page_number`
- `selected_text`
- `selection_rects` (JSON)
- `selection_anchor` (JSON)
- `citation_label`
- `citation_order`
- `is_deleted`
- `created_at`

## Implementation Phases

### Phase 1: Project Setup

- Initialize frontend app
- Configure Supabase project connection
- Set up authentication
- Set up base layout
- Define rich text editor approach
- Define row-level security for private user data

### Phase 2: PDF Management

- Upload PDFs to Supabase Storage
- Save document metadata in Supabase
- Render PDFs in the browser
- Allow attaching multiple PDFs to a workspace

### Phase 3: Notes

- Create note editor UI
- Save and load notes from Supabase
- Enable autosave
- Associate notes with multiple documents
- Render inline citation buttons inside note content

### Phase 4: Citation Feature

- Detect text selection in PDF
- Provide `Cite` action
- Save citation metadata
- Insert citation token into note editor
- Handle click-to-jump from note back to PDF
- Re-open the correct PDF if the citation belongs to a different document
- Re-highlight the cited text
- Support citation deletion and cleanup behavior

### Phase 5: Polish

- Better highlighting UX
- Citation hover preview
- Search/filter documents and notes
- Error handling and empty states

## Risks / Technical Unknowns

1. PDF text selection and coordinate capture can be tricky depending on the rendering library.
2. Jumping back to the exact cited region is easier if we store both page number and selection coordinates, not only text.
3. Rich text notes with inline citation buttons should be represented as structured editor content, not plain text, to avoid broken references.
4. Citation numbering behavior after deletion needs to be defined carefully so existing note references remain understandable.
5. One-note-multiple-PDF workflow means the app must handle switching documents without losing editor state.

## Open Questions For Requirements

1. Confirm the workspace model: one workspace contains one note and can link to many PDFs, while a user can still create many separate workspaces.
2. Should deleting a citation remove the button from the note immediately, or show it as a broken/removed reference until the user cleans it up?
3. Do you want users to create citations only from text selection, or also from area selection later?
4. Should uploaded PDFs remain available in a personal library even after being detached from a note?

## Current Assumptions

Unless you say otherwise, the first implementation will assume:

- Users have accounts
- Users upload their own PDFs
- Notes are private to the owning user
- Users can have multiple notes
- Each workspace can reference multiple PDFs through its single embedded note
- PDFs remain in the user's personal library unless explicitly deleted
- Notes support basic rich text plus structured inline citations
- Clicking a citation opens the correct PDF, jumps to the page, and re-highlights the cited selection
- Citation buttons render visually as `[1]`, `[2]`, etc.
- Desktop-first layout
- Notes and citation metadata autosave to Supabase

## Next Step

Finalize the remaining workflow details above, then start implementation with a scaffolded frontend and Supabase schema.
