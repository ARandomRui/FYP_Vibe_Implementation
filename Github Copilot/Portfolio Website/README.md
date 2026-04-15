# Portfolio Website with Vercel Contact Backend

This project includes:

- Static frontend (`index.html`, `styles.css`, `script.js`)
- Serverless backend endpoint (`api/contact.js`)
- Email delivery via Resend
- Anti-spam protection (honeypot, minimum submit time, request rate limiting)

## 1) Run locally

1. Install Node.js (v18+ recommended).
2. Install Vercel CLI:

```bash
npm i -g vercel
```

3. In this project folder, copy environment variables:

```bash
copy .env.example .env.local
```

4. Update `.env.local` with your real values.
5. Start local dev server:

```bash
vercel dev
```

Open `http://localhost:3000`.

## 2) Create Resend credentials

1. Sign in at https://resend.com.
2. Create an API key.
3. Verify a sending domain (recommended) or use `onboarding@resend.dev` for testing.

## 3) Deploy to Vercel (Dashboard method)

1. Push this project to GitHub.
2. In Vercel, click **Add New... > Project** and import your repository.
3. In **Project Settings > Environment Variables**, add:
   - `RESEND_API_KEY`
   - `CONTACT_TO_EMAIL`
   - `CONTACT_FROM_EMAIL`
   - `CONTACT_RATE_LIMIT_MAX` (example: `5`)
   - `CONTACT_RATE_LIMIT_WINDOW_MS` (example: `600000`)
4. Deploy.

After deployment, submitting the form will call `/api/contact` and send an email.

## 4) Deploy to Vercel (CLI method)

Run these commands from the project folder:

```bash
vercel login
vercel
```

When prompted, set project values and deploy.

Add environment variables:

```bash
vercel env add RESEND_API_KEY
vercel env add CONTACT_TO_EMAIL
vercel env add CONTACT_FROM_EMAIL
vercel env add CONTACT_RATE_LIMIT_MAX
vercel env add CONTACT_RATE_LIMIT_WINDOW_MS
```

Then redeploy:

```bash
vercel --prod
```

## Notes

- If `CONTACT_FROM_EMAIL` is not from a verified domain, email sending may fail in production.
- The backend validates required fields and email format before sending.
- Rate limiting in this starter uses in-memory serverless state and may reset on cold starts.
- For stricter production limits, use a shared store like Upstash Redis or Vercel KV.