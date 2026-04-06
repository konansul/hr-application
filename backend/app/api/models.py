from __future__ import annotations

from typing import Literal, Optional, Dict, Any, List
from pydantic import BaseModel, EmailStr


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


class ApplicationStatusUpdate(BaseModel):
    status: Literal["Applied", "Shortlisted", "HR Interview", "Tech Interview", "Offer", "Rejected"]

class ProfileUpdateRequest(BaseModel):
    profile_data: Dict[str, Any]


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