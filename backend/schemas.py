from pydantic import BaseModel, Field, field_validator
from typing import List


class ScoreRequest(BaseModel):
    resume_text: str = Field(min_length=40)
    job_description: str = Field(min_length=20)


class ScoreResponse(BaseModel):
    ats_score: int = Field(ge=0, le=100)
    matched_keywords: List[str]
    missing_keywords: List[str]
    suggestions: List[str]
    summary: str

    @field_validator("ats_score")
    @classmethod
    def clamp_score(cls, v: int) -> int:
        # Belt and suspenders: even though the Gemini schema constrains this
        # to an integer, clamp defensively in case the model drifts outside
        # 0-100 despite the constraint.
        return max(0, min(100, v))


class CoverLetterRequest(BaseModel):
    resume_text: str = Field(min_length=40)
    job_description: str = Field(min_length=20)
    tone: str = Field(default="professional")


class CoverLetterResponse(BaseModel):
    subject_line: str
    body: str
