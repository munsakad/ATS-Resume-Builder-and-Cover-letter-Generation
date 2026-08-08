import os
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from schemas import ScoreRequest, ScoreResponse, CoverLetterRequest, CoverLetterResponse
from gemini_service import score_resume, generate_cover_letter, GenerationError

load_dotenv()

app = FastAPI(title="Resume Builder AI Service")

FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


def verify_internal_key(x_internal_key: str | None):
    """
    The Next.js server (never the browser) calls this service, and includes
    this header on every request. Without it, anything that can reach this
    service's port — intentionally or by network misconfiguration — could
    call directly into Gemini on your API key's dime. This is the riskiest
    piece flagged on the whiteboard: don't skip it, even for local dev.
    """
    expected = os.environ.get("INTERNAL_API_KEY")
    if not expected:
        raise HTTPException(status_code=500, detail="INTERNAL_API_KEY is not configured on the backend")
    if x_internal_key != expected:
        raise HTTPException(status_code=401, detail="Missing or invalid internal API key")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/score", response_model=ScoreResponse)
def score(req: ScoreRequest, x_internal_key: str | None = Header(default=None)):
    verify_internal_key(x_internal_key)
    try:
        return score_resume(req.resume_text, req.job_description)
    except GenerationError as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/cover-letter", response_model=CoverLetterResponse)
def cover_letter(req: CoverLetterRequest, x_internal_key: str | None = Header(default=None)):
    verify_internal_key(x_internal_key)
    try:
        return generate_cover_letter(req.resume_text, req.job_description, req.tone)
    except GenerationError as e:
        raise HTTPException(status_code=502, detail=str(e))
