# Resume Builder — AI service (Python/FastAPI)

Owns all Gemini calls: ATS scoring and cover letter generation. Called
server-to-server by the Next.js frontend — never directly by the browser.

## Run it locally

Requires Python 3.10+.

```bash
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

`.env` is already created with a generated `INTERNAL_API_KEY` — copy that
same value into the frontend's `.env` as `FRONTEND_INTERNAL_API_KEY` (see
the frontend README). Add your `GEMINI_API_KEY` (free at
https://aistudio.google.com/apikey).

```bash
uvicorn main:app --reload --port 8000
```

Runs at http://localhost:8000. Check http://localhost:8000/health.

## Endpoints

- `POST /score` — `{resume_text, job_description}` → ATS score, matched/missing
  keywords, suggestions.
- `POST /cover-letter` — `{resume_text, job_description, tone}` → tailored
  cover letter.

Both require an `X-Internal-Key` header matching `INTERNAL_API_KEY` — this
is the trust boundary between the two services. Requests without it are
rejected with 401, on purpose: see the comment in `main.py`.

## Reliability approach

Every Gemini call uses `response_schema` (constrained JSON output) and the
result is validated with Pydantic (`schemas.py`) before being returned. A
malformed model response raises a clear 502 instead of passing bad data
downstream — the frontend then does its own zod validation as a second,
independent check.
