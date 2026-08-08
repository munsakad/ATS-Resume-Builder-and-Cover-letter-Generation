import { z } from "zod";

// Second, independent validation layer on top of the Python service's own
// Pydantic check — this side trusts nothing about the response shape either,
// even though it's a service we control. See backend/README.md for why.

const ScoreSchema = z.object({
  ats_score: z.number().int().min(0).max(100),
  matched_keywords: z.array(z.string()),
  missing_keywords: z.array(z.string()),
  suggestions: z.array(z.string()),
  summary: z.string(),
});

const CoverLetterSchema = z.object({
  subject_line: z.string(),
  body: z.string(),
});

export class AiServiceError extends Error {}

function backendUrl() {
  return process.env.AI_BACKEND_URL || "http://localhost:8000";
}

function internalKey() {
  const key = process.env.FRONTEND_INTERNAL_API_KEY;
  if (!key) throw new AiServiceError("FRONTEND_INTERNAL_API_KEY is not set");
  return key;
}

async function callBackend(path: string, body: unknown) {
  let res: Response;
  try {
    res = await fetch(`${backendUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Key": internalKey() },
      body: JSON.stringify(body),
      // Gemini calls can take a few seconds — don't let Next.js's default
      // fetch timeout cut it off early.
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    throw new AiServiceError("Could not reach the AI backend. Is it running on port 8000?");
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new AiServiceError(detail.detail || `AI backend returned ${res.status}`);
  }
  return res.json();
}

export async function scoreResume(resumeText: string, jobDescription: string) {
  const data = await callBackend("/score", { resume_text: resumeText, job_description: jobDescription });
  const parsed = ScoreSchema.safeParse(data);
  if (!parsed.success) throw new AiServiceError("AI backend response didn't match the expected format");
  return parsed.data;
}

export async function generateCoverLetter(resumeText: string, jobDescription: string, tone = "professional") {
  const data = await callBackend("/cover-letter", { resume_text: resumeText, job_description: jobDescription, tone });
  const parsed = CoverLetterSchema.safeParse(data);
  if (!parsed.success) throw new AiServiceError("AI backend response didn't match the expected format");
  return parsed.data;
}
