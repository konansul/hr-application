from typing import List, Optional, Literal, Any
from datetime import datetime
from pydantic import BaseModel

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

class JobCreateRequest(BaseModel):
    title: str
    description: str
    region: Optional[str] = None
    screening_questions: Optional[List[str]] = None

class JobCreate(BaseModel):
    title: str
    description: str
    level: Optional[str] = None
    status: Optional[Literal['draft', 'active', 'suspended', 'closed']] = "draft"
    pipeline_stages: Optional[List[str]] = None
    requirements: Optional[JobRequirementsBase] = None

class JobUpdate(BaseModel):
    title: str
    description: str
    region: Optional[str] = None
    screening_questions: Optional[List[Any]] = None
    level: Optional[str] = None
    status: Optional[Literal['draft', 'active', 'suspended', 'closed']] = None
    pipeline_stages: Optional[List[str]] = None
    requirements: Optional[JobRequirementsBase] = None

class JobResponse(BaseModel):
    job_id: str
    owner_user_id: str
    title: str
    description: str
    region: Optional[str] = None
    screening_questions: Optional[List[str]] = None

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
    created_at: Optional[datetime] = None
    organization_name: Optional[str] = None

    class Config:
        from_attributes = True

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