# PaperTrail Notes

Desktop-first PDF reading and note-taking app with workspace-based organization, Supabase storage, and clickable citations that jump back to the original PDF text.

## Features

- Email/password authentication with Supabase Auth
- Private PDF uploads stored in Supabase Storage
- Private workspaces stored in Supabase Postgres
- Each workspace contains one rich-text note and can link to multiple PDFs
- Select text in a PDF and insert a citation chip like `[1]` into the workspace note
- Click a citation chip to reopen the source PDF page and re-highlight the original selection
- Autosave for workspace title and note content
- Citation deletion with immediate removal from the workspace note

## Stack

- React + TypeScript + Vite
- `react-pdf` for PDF rendering
- `@supabase/supabase-js` for auth, database, and storage access

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
copy .env.example .env
```

3. Fill in:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

4. In Supabase SQL Editor, run:

- [supabase/schema.sql](C:\Users\Home\Desktop\Vibe Coding FYP\FYP_Vibe_Implementation\Codex\Online PDF Viewer\supabase\schema.sql)

5. Start the app:

```bash
npm run dev
```

## Notes

- The app uses signed URLs for private PDF access.
- Citation numbering is stable per workspace and does not renumber after deletion.
- PDFs can exist in the library without being linked to the current workspace.
- If you already ran an older schema with `notes` tables, reset the database or replace it with the current `workspaces` schema before testing.
