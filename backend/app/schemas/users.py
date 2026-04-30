from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr

class RegisterRequest(BaseModel):
    email: str
    password: str
    role: str = "candidate"
    organization_name: Optional[str] = None
    first_name: str
    last_name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserMeResponse(BaseModel):
    user_id: str
    email: str
    role: str
    org_id: Optional[str] = None
    person_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    ai_quota: int = 10
    ai_used: int = 0

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

class PublicProfileOut(BaseModel):
    person_id: str
    first_name: str
    last_name: str
    profile_data: dict

    class Config:
        from_attributes = True

class UrlImportRequest(BaseModel):
    url: str