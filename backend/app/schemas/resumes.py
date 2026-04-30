from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

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
    source_resume_id: Optional[str] = None

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

class FetchJobUrlRequest(BaseModel):
    url: str