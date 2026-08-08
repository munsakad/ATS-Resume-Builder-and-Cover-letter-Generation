# AI Resume Builder

ATS scoring, tailored cover letter generation, and client-side PDF export.
Two services, no Docker:

- **`frontend/`** — Next.js/React. Auth, resume storage, UI, PDF export.
- **`backend/`** — Python/FastAPI. Owns all Gemini calls.

## Quick start

```bash
# 1. Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# add your GEMINI_API_KEY to backend/.env (see backend/README.md)
uvicorn main:app --reload --port 8000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000. Full details in each service's own README.

## Why two services

The Python side owns the Gemini API key entirely — it's never exposed to
the browser or even to the Next.js server's environment. The two
communicate over a shared-secret header (`X-Internal-Key`), generated
automatically into both `.env` files so they match out of the box. See
`backend/main.py` and `backend/README.md` for the reasoning.

## Reliability

Every Gemini call is schema-constrained (`response_schema`) and validated
twice — once with Pydantic in Python, once with zod in Next.js — before
the result is trusted or saved. A malformed AI response fails loudly
instead of quietly corrupting a resume score or cover letter.
