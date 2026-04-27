from __future__ import annotations

from typing import Literal, Optional, Dict, Any, List
from pydantic import BaseModel, EmailStr, Field

from backend.app.schemas import JobRequirementsBase


class RegisterRequest(BaseModel):
    email: str
    password: str
    role: str = "candidate"
    organization_name: Optional[str] = None
    first_name: str
    last_name: str


class UserMeResponse(BaseModel):
    user_id: str
    email: str
    role: str
    org_id: Optional[str] = None
    person_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class JobCreateRequest(BaseModel):
    title: str
    description: str
    region: Optional[str] = None
    screening_questions: Optional[List[str]] = None


class JobResponse(BaseModel):
    job_id: str
    owner_user_id: str
    title: str
    description: str
    region: Optional[str] = None
    screening_questions: Optional[List[str]] = None


class DocumentResponse(BaseModel):
    document_id: str
    owner_user_id: str
    filename: str
    content_type: Optional[str] = None
    source_type: str
    resume_id: Optional[str] = None
    parsed_data: Optional[Dict[str, Any]] = None
    raw_text: Optional[str] = None
    candidate_name: Optional[str] = None
    document_role: Optional[str] = None


class ScreeningResultResponse(BaseModel):
    result_id: str
    score: int
    decision: str
    status: str
    summary: str


class JobRefineRequest(BaseModel):
    title: str
    description: str
    region: Optional[str] = None
    include_di_clause: bool = False
    include_anti_scam: bool = False
    include_eeo_statement: bool = False
    include_pay_transparency: bool = False
    include_gdpr_notice: bool = False
    include_eu_salary_law: bool = False
    include_visa_sponsorship: bool = False


class JobRefineResponse(BaseModel):
    improved_description: str


class JobUpdate(BaseModel):
    title: str
    description: str
    region: Optional[str] = None
    screening_questions: Optional[List[Any]] = None
    level: Optional[str] = None
    status: Optional[Literal['draft', 'active', 'suspended', 'closed']] = None
    pipeline_stages: Optional[List[str]] = None
    requirements: Optional[JobRequirementsBase] = None


class ApplicationStatusUpdate(BaseModel):
    status: Literal["Applied", "Shortlisted", "HR Interview", "Tech Interview", "Offer", "Rejected"]


class ProfileUpdateRequest(BaseModel):
    profile_data: Dict[str, Any]


class ResumeCreateFromProfileRequest(BaseModel):
    language: str = "en"
    title: Optional[str] = None
    resume_data: Optional[Dict[str, Any]] = None
    attach_document_id: Optional[str] = None
    generate_from_profile_if_empty: bool = True
    valid_until: Optional[str] = None
    removed_sections: List[str] = Field(default_factory=list)


class ResumeDuplicateRequest(BaseModel):
    language: Optional[str] = None
    title: Optional[str] = None
    resume_data: Optional[Dict[str, Any]] = None
    removed_sections: List[str] = Field(default_factory=list)
    valid_until: Optional[str] = None


class ResumeFromJobDescriptionRequest(BaseModel):
    job_description: str
    language: str = "en"
    title: Optional[str] = None
    valid_until: Optional[str] = None
    removed_sections: List[str] = Field(default_factory=list)
    job_id: Optional[str] = None
    source_resume_id: Optional[str] = None  # which resume version to adapt from


class FetchJobUrlRequest(BaseModel):
    url: str


class ResumeUpdateRequest(BaseModel):
    language: Optional[str] = None
    title: Optional[str] = None
    resume_data: Dict[str, Any]
    generated_document_id: Optional[str] = None


class ResumeVersionResponse(BaseModel):
    resume_id: str
    person_id: str
    language: str
    title: Optional[str] = None
    source_type: str
    source_document_id: Optional[str] = None
    generated_document_id: Optional[str] = None
    source_resume_id: Optional[str] = None
    generation_status: str
    resume_data: Dict[str, Any]
    profile_snapshot: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None



class HRProfileUpdate(BaseModel):
    first_name: str = ""
    last_name: str = ""
    phone: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    company_name: Optional[str] = None
    department: Optional[str] = None
    hr_role_title: Optional[str] = None
    timezone: Optional[str] = None


class UrlImportRequest(BaseModel):
    url: str