# PDF Website (Codex)

Welcome to the Codex PDF Website project!

This is a web application designed for interacting with PDFs.

## How to Run Locally

While you can access the live version of this app online, you can also run it locally.

1. **Navigate to the Source Code**:
   ```bash
   cd "Online PDF Viewer"
   ```
2. **Setup Environment Variables**:
   - Duplicate the `.env.example` file and rename it to `.env` (or `.env.local`).
   - Fill in any necessary API keys specified in the file.
3. **Run the App**: 
   Since this is a web application, you can typically run it using a local development server:
   ```bash
   npm install
   npm run dev
   ```
   If it is purely static HTML/JS without a build step, simply open `index.html` in your browser or run:
   ```bash
   python -m http.server
   ```
