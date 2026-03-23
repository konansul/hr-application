from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    organization_name: str
    role: Literal["hr", "candidate"] = "candidate"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserMeResponse(BaseModel):
    user_id: str
    email: EmailStr
    role: str
    org_id: Optional[str] = None


class JobCreateRequest(BaseModel):
    title: str
    description: str


class JobResponse(BaseModel):
    job_id: str
    owner_user_id: str
    title: str
    description: str


class DocumentResponse(BaseModel):
    document_id: str
    owner_user_id: str
    filename: str
    content_type: Optional[str] = None
    source_type: str


class ScreeningResultResponse(BaseModel):
    result_id: str
    score: int
    decision: str
    status: str
    summary: str


class JobRefineRequest(BaseModel):
    title: str
    description: str


class JobRefineResponse(BaseModel):
    improved_description: str


class JobUpdate(BaseModel):
    title: str
    description: str


class ScreeningStatusUpdate(BaseModel):
    status: Literal["New", "Shortlisted", "Selected", "Rejected"]