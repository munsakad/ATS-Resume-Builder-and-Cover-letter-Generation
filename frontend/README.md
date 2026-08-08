# Resume Builder — frontend (Next.js)

Auth, resume storage, the UI, and client-side PDF export. All Gemini calls
are delegated to the Python backend in `../backend` — see that folder's
README first and get it running before this one.

## Run it locally

Requires Node.js 18+, and the Python backend running on port 8000.

```bash
cd frontend
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000. Sign in with the seeded account
(`sam@resumeai.dev` / `Student123!`) or register your own.

`.env` is already set up with a generated `NEXTAUTH_SECRET` and a
`FRONTEND_INTERNAL_API_KEY` that's pre-matched to the backend's
`INTERNAL_API_KEY` — if you regenerate either one, update both files to
match, or requests to the AI backend will get a 401.

## Running both services

Two terminals, no Docker:

```bash
# Terminal 1
cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

## How it works

1. **Add resume** (`/resumes/new`) — upload a PDF/text file or paste text.
   Next.js extracts the text server-side (`pdf-parse`) and stores it.
2. **Score / cover letter** (`/resumes/:id`) — paste a job description, then:
   - `/api/analyze` sends resume text + JD to the Python `/score` endpoint,
     validates the response with zod, and saves an `Analysis`.
   - `/api/cover-letter` does the same against `/cover-letter`, saves a
     `CoverLetter`.
3. **PDF export** — both the resume and any generated cover letter can be
   downloaded as a PDF, rendered entirely client-side with
   `@react-pdf/renderer` (`src/components/PdfDocs.tsx`) — no server
   round-trip needed for export itself.

## Data model

See `prisma/schema.prisma`: `User` → `Resume[]` → `Analysis[]` +
`CoverLetter[]`.

## Going to production

- Swap Prisma's `sqlite` provider for `postgresql`.
- Set fresh `NEXTAUTH_SECRET` and `FRONTEND_INTERNAL_API_KEY` (update both
  services to match).
- Point `AI_BACKEND_URL` at wherever the Python service is deployed, and
  update `FRONTEND_ORIGIN` in the backend's `.env` to your deployed
  frontend URL (CORS).
