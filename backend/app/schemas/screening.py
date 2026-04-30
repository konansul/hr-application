from typing import List, Optional, Literal
from pydantic import BaseModel
from .jobs import JobRequirementsBase

class ApplicationStatusUpdate(BaseModel):
    status: Literal["Applied", "Shortlisted", "HR Interview", "Tech Interview", "Offer", "Rejected"]

class Candidate(BaseModel):
    name: str
    cv_text: str

class Skill(BaseModel):
    name: str
    years: Optional[float] = None

class CandidateProfile(BaseModel):
    skills: List[Skill]
    experience_years: Optional[float] = None

class ScreeningRequest(BaseModel):
    cv_text: str
    job_description: str
    requirements: Optional[JobRequirementsBase] = None

class RequirementCheck(BaseModel):
    requirement: str
    status: Literal["met", "partial", "missing"]
    evidence: Optional[str] = None

class ScreeningResultResponse(BaseModel):
    result_id: str
    score: int
    decision: str
    status: str
    summary: str

class ScreeningResult(BaseModel):
    result_id: Optional[str] = None
    filename: Optional[str] = None
    status: Optional[str] = "APPLIED"
    score: int
    decision: Literal["strong_yes", "yes", "maybe", "no"]
    summary: str
    must_have: List[RequirementCheck]
    nice_to_have: List[RequirementCheck]
    missing_skills: List[str]
    matched_skills: List[str]
    recommendations: List[str]
    interview_questions: List[str]
    risks: List[str]
    profile: CandidateProfile
    cv_text_preview: Optional[str] = None

class RankedCandidate(BaseModel):
    filename: str
    score: int
    decision: str
    summary: str
    matched_skills: List[str]
    missing_skills: List[str]
    risks: List[str]

class BatchFileError(BaseModel):
    filename: str
    error: str

class BatchScreeningResult(BaseModel):
    total_files: int
    processed_files: int
    failed_files: int
    ranked_candidates: List[RankedCandidate]
    errors: List[BatchFileError]

class RewrittenBullet(BaseModel):
    original: str
    improved: str

class CVImprovementResult(BaseModel):
    overall_score: int
    summary: str
    strengths: List[str]
    weaknesses: List[str]
    missing_keywords: List[str]
    improvements: List[str]
    improved_summary: str
    rewritten_bullets: List[RewrittenBullet]
    cv_text_preview: str