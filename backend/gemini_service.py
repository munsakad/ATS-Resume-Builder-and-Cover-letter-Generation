import os
import json
import google.generativeai as genai
from schemas import ScoreResponse, CoverLetterResponse

# Same reliability pattern used across the other AI features in this suite:
# constrain Gemini's output shape with a response_schema, THEN validate with
# Pydantic before trusting it. The schema keeps the model honest about
# structure; Pydantic is what actually guarantees it at runtime and turns a
# malformed response into a clear error instead of corrupted data reaching
# the frontend.


class GenerationError(Exception):
    pass


def _get_model(response_schema: dict):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise GenerationError("GEMINI_API_KEY is not set on the backend")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(
        "gemini-3.8-flash",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": response_schema,
        },
    )


SCORE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "ats_score": {"type": "INTEGER", "description": "0-100 match score between resume and job description"},
        "matched_keywords": {"type": "ARRAY", "items": {"type": "STRING"}},
        "missing_keywords": {"type": "ARRAY", "items": {"type": "STRING"}},
        "suggestions": {"type": "ARRAY", "items": {"type": "STRING"}, "description": "3-6 concrete, actionable edits"},
        "summary": {"type": "STRING", "description": "One or two sentence overall assessment"},
    },
    "required": ["ats_score", "matched_keywords", "missing_keywords", "suggestions", "summary"],
}

COVER_LETTER_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "subject_line": {"type": "STRING"},
        "body": {"type": "STRING", "description": "Full cover letter body, 3-5 paragraphs, plain text with \\n\\n between paragraphs"},
    },
    "required": ["subject_line", "body"],
}


def _generate(prompt: str, schema: dict) -> dict:
    model = _get_model(schema)
    try:
        result = model.generate_content(prompt)
        raw = result.text
    except Exception as e:
        raise GenerationError(f"Gemini request failed: {e}")

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise GenerationError("The AI returned a response we couldn't parse")


def score_resume(resume_text: str, job_description: str) -> ScoreResponse:
    prompt = f"""You are an ATS (Applicant Tracking System) resume screener.
Compare the resume below against the job description and produce:
- ats_score: an integer 0-100 estimating how well this resume would score in
  an automated ATS keyword/skills match against this job description.
- matched_keywords: important skills/terms from the job description that
  ARE present in the resume.
- missing_keywords: important skills/terms from the job description that are
  NOT present in the resume and should be added if genuinely true of the
  candidate.
- suggestions: 3-6 concrete, specific edits to improve the ATS match
  (e.g. "Add 'Kubernetes' to your skills section" not vague advice).
- summary: one or two sentence overall assessment.

Be honest and specific — do not inflate the score.

RESUME:
\"\"\"
{resume_text[:8000]}
\"\"\"

JOB DESCRIPTION:
\"\"\"
{job_description[:4000]}
\"\"\""""

    data = _generate(prompt, SCORE_SCHEMA)
    try:
        return ScoreResponse.model_validate(data)
    except Exception as e:
        raise GenerationError(f"AI response didn't match the expected format: {e}")


def generate_cover_letter(resume_text: str, job_description: str, tone: str) -> CoverLetterResponse:
    prompt = f"""Write a {tone} cover letter for the candidate below, tailored
to the job description. Base every claim strictly on what's actually in the
resume — never invent experience, employers, or skills not present in it.
3-5 paragraphs. Return the body as plain text with blank lines between
paragraphs (no markdown, no placeholders like [Company Name] — infer the
company/role name from the job description text itself if possible,
otherwise write around it naturally).

RESUME:
\"\"\"
{resume_text[:8000]}
\"\"\"

JOB DESCRIPTION:
\"\"\"
{job_description[:4000]}
\"\"\""""

    data = _generate(prompt, COVER_LETTER_SCHEMA)
    try:
        return CoverLetterResponse.model_validate(data)
    except Exception as e:
        raise GenerationError(f"AI response didn't match the expected format: {e}")
