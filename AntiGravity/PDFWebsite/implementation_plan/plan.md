# Implementation Plan: PDF Viewer & Note-taking with Citation (Research Paper Model)

This project aims to build a web application that allows users to write research notes ("master notes") while reviewing multiple PDF documents. A key feature is the ability to select text within any PDF and generate a citation link in the master note. Clicking this citation link in the note will automatically open the correct PDF and navigate to the exact location of the highlighted text. All data is stored in Supabase.

## User Review Required

> [!IMPORTANT]
> The data architecture has been updated based on your recent feedback ("one master note to many pdfs"). Please review the updated workflow below and approve it so we can proceed with building the new UI.

## Proposed Architecture & Stack (Updated)

### Frontend
- **Framework:** React with Vite.
- **PDF Rendering & Highlighting:** `react-pdf-highlighter` (built on `pdf.js`). 
- **Note Editor:** TipTap (Rich Text Editor).
- **Styling:** Vanilla CSS with modern, dynamic aesthetics (glassmorphism).

### Core Features & New Workflow
1. **Dashboard:** 
   - Displays a list of the user's **Research Notes** (Master notes).
   - Also displays the user's **PDF Library** (upload new literature here).
2. **The Workspace (`/workspace/:noteId`):**
   - The user opens a specific **Note**.
   - **Right Panel:** The TipTap Note Editor.
   - **Left Panel:** The PDF Viewer. It includes a dropdown or side-panel to switch between any PDF in the user's library.
3. **Citation Engine:**
   - User selects text in the currently active PDF.
   - Clicks "Cite".
   - A citation token is inserted into the note. This token stores the `pdf_id`, `page_number`, and `bounding_box`.
   - **Clicking the token in the note:** The app checks which `pdf_id` the citation belongs to. If that PDF isn't currently open in the left panel, it seamlessly switches to it, then scrolls to and highlights the cited text.

### Updated Supabase Schema (Draft)

#### `pdfs` table (Global Library)
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users)
- `filename` (text)
- `file_url` (text)

#### `notes` table (Research Papers)
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users)
- `title` (text)
- `content` (jsonb)

## Verification Plan

### Manual Verification
- Verify PDF uploads to the global library.
- Verify creating and opening a Research Note.
- Verify switching PDFs within the Workspace left-panel.
- Test cross-PDF citations: Cite from PDF A, switch to PDF B, cite from PDF B. Click citation A in the note and verify the viewer switches back to PDF A and scrolls.
