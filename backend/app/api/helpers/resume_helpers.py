import json
from typing import Any, Dict

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.pipeline import translate_resume_data, logger
from backend.database.models import Resume, User, Person


def loads(data: str | None, default: Any):
    if not data:
        return default
    try:
        return json.loads(data)
    except Exception:
        return default


def ensure_person(db: Session, current_user: User) -> Person:
    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person profile not found")
    return person


def default_profile_from_person(person: Person, current_user: User) -> Dict[str, Any]:
    return {
        "personal_info": {
            "first_name": person.first_name or "",
            "last_name": person.last_name or "",
            "email": current_user.email or "",
            "phone": person.phone or "",
            "city": person.city or "",
            "country": person.country or "",
            "nationality": "",
            "visa_status": "UNKNOWN",
            "work_preference": "UNKNOWN",
            "open_to_remote": False,
            "open_to_relocation": False,
            "linkedin_url": "",
            "github_url": "",
            "portfolio_url": "",
            "summary": "",
        },
        "experience": [],
        "education": [],
        "skills": [],
        "languages": [],
        "certifications": [],
    }


def profile_payload(person: Person, current_user: User) -> Dict[str, Any]:
    profile_data = loads(person.profile_json, None)
    return profile_data or default_profile_from_person(person, current_user)


def resume_payload(resume: Resume) -> Dict[str, Any]:
    return loads(resume.payload, {})


def apply_translation(resume_data: Dict[str, Any], language: str) -> Dict[str, Any]:
    if not language or language == "en":
        return resume_data
    try:
        return translate_resume_data(resume_data, language)
    except Exception as e:
        logger.warning(f"Translation to '{language}' failed, using original: {e}")
        return resume_data


def resume_response(resume: Resume) -> Dict[str, Any]:
    return {
        "resume_id": resume.resume_id,
        "person_id": resume.person_id,
        "language": resume.language or "en",
        "title": resume.title,
        "source_type": resume.source_type,
        "source_document_id": resume.source_document_id,
        "generated_document_id": resume.generated_document_id,
        "source_resume_id": resume.source_resume_id,
        "generation_status": resume.generation_status,
        "valid_until": resume.valid_until,
        "job_description": resume.job_description,
        "resume_data": resume_payload(resume),
        "profile_snapshot": loads(resume.profile_snapshot_json, None),
        "created_at": resume.created_at.isoformat() if resume.created_at else None,
        "updated_at": resume.updated_at.isoformat() if resume.updated_at else None,
    }