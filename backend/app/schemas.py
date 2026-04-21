from pydantic import BaseModel
from typing import List, Optional, Literal, Any

class JobRequirementsBase(BaseModel):
    workFormat: Optional[str] = "Any"
    willingToRelocate: Optional[bool] = False
    remoteCountryRestriction: Optional[str] = ""
    officeDaysRequired: Optional[str] = ""
    timeZoneMatch: Optional[str] = ""
    openToDifferentTimeZone: Optional[bool] = False
    visaSponsorship: Optional[bool] = False
    validWorkPermitRequired: Optional[bool] = True
    salaryMin: Optional[str] = ""
    salaryMax: Optional[str] = ""
    currency: Optional[str] = "USD"
    salaryExpectationRequired: Optional[bool] = False
    maxNoticePeriod: Optional[str] = ""
    immediateStartRequired: Optional[bool] = False
    minExperienceYears: Optional[str] = ""
    maxExperienceYears: Optional[str] = ""
    requiredSeniority: Optional[str] = "Any"
    mandatorySkills: Optional[str] = ""
    mandatoryTechnologies: Optional[str] = ""
    minEducation: Optional[str] = "Any"
    degreeField: Optional[str] = ""
    mandatoryCertifications: Optional[str] = ""
    willingToTravel: Optional[bool] = False
    drivingLicense: Optional[bool] = False
    languageRequirements: Optional[str] = ""

class JobCreate(BaseModel):
    title: str
    description: str
    level: Optional[str] = None
    status: Optional[Literal['draft', 'active', 'suspended', 'closed']] = "draft"
    pipeline_stages: Optional[List[str]] = None
    requirements: Optional[JobRequirementsBase] = None

class JobOut(BaseModel):
    id: str
    title: str
    description: str
    region: Optional[str] = None
    screening_questions: List[Any] = []
    level: Optional[str] = None
    status: Optional[str] = "draft"
    pipeline_stages: List[str] = []
    owner_user_id: Optional[str] = None
    requirements: Optional[JobRequirementsBase] = None

    class Config:
        from_attributes = True
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


class RequirementCheck(BaseModel):
    requirement: str
    status: Literal["met", "partial", "missing"]
    evidence: Optional[str] = None


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