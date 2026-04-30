from __future__ import annotations

import base64
import copy
import json
import logging
from datetime import date
from typing import Any, Dict, List, Optional

import resend
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.api.helpers.ownership import get_current_user
from backend.app.api.models import (
    FetchJobUrlRequest,
    ResumeCreateFromProfileRequest,
    ResumeDuplicateRequest,
    ResumeFromJobDescriptionRequest,
    ResumeUpdateRequest,
)
from backend.app.core.config import settings
from backend.app.pipeline import adapt_resume_for_job, fetch_job_from_url, translate_resume_data
from backend.database.db import get_db
from backend.database.models import Document, Person, Resume, User
from backend.database.storage import new_id

logger = logging.getLogger(__name__)

router = APIRouter()


def _loads(data: str | None, default: Any):
    if not data:
        return default
    try:
        return json.loads(data)
    except Exception:
        return default


def _ensure_person(db: Session, current_user: User) -> Person:
    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person profile not found")
    return person


def _default_profile_from_person(person: Person, current_user: User) -> Dict[str, Any]:
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


def _profile_payload(person: Person, current_user: User) -> Dict[str, Any]:
    profile_data = _loads(person.profile_json, None)
    return profile_data or _default_profile_from_person(person, current_user)


def _resume_payload(resume: Resume) -> Dict[str, Any]:
    return _loads(resume.payload, {})


def _apply_translation(resume_data: Dict[str, Any], language: str) -> Dict[str, Any]:
    """Translate resume_data if the target language is not English. Falls back silently."""
    if not language or language == "en":
        return resume_data
    try:
        return translate_resume_data(resume_data, language)
    except Exception as e:
        logger.warning(f"Translation to '{language}' failed, using original: {e}")
        return resume_data


def _resume_response(resume: Resume) -> Dict[str, Any]:
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
        "resume_data": _resume_payload(resume),
        "profile_snapshot": _loads(resume.profile_snapshot_json, None),
        "created_at": resume.created_at.isoformat() if resume.created_at else None,
        "updated_at": resume.updated_at.isoformat() if resume.updated_at else None,
    }


@router.get("/resumes")
def list_my_resume_versions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    person = _ensure_person(db, current_user)
    resumes = (
        db.query(Resume)
        .filter(Resume.person_id == person.person_id)
        .order_by(Resume.created_at.desc())
        .all()
    )

    today = date.today().isoformat()  # e.g. "2026-04-13"
    expired_ids = [
        r.resume_id for r in resumes
        if r.valid_until and r.valid_until < today
    ]
    if expired_ids:
        for rid in expired_ids:
            db.execute(text("UPDATE applications SET resume_id = NULL WHERE resume_id = :rid"), {"rid": rid})
            db.execute(text("UPDATE documents SET resume_id = NULL WHERE resume_id = :rid"), {"rid": rid})
            db.execute(text("UPDATE resumes SET source_resume_id = NULL WHERE source_resume_id = :rid"), {"rid": rid})
            db.execute(text("DELETE FROM resumes WHERE resume_id = :rid"), {"rid": rid})
        db.commit()
        logger.info("Auto-deleted %d expired resume(s): %s", len(expired_ids), expired_ids)
        resumes = [r for r in resumes if r.resume_id not in expired_ids]

    return [_resume_response(resume) for resume in resumes]


@router.get("/resumes/latest")
def get_latest_resume(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    person = _ensure_person(db, current_user)
    resume = (
        db.query(Resume)
        .filter(Resume.person_id == person.person_id)
        .order_by(Resume.created_at.desc())
        .first()
    )
    if not resume:
        return None
    response = _resume_response(resume)
    response.update(response["resume_data"])
    return response


@router.post("/resumes/from-profile")
def create_resume_from_profile(
    request: ResumeCreateFromProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    person = _ensure_person(db, current_user)
    profile_data = _profile_payload(person, current_user)

    if not profile_data and not request.generate_from_profile_if_empty:
        raise HTTPException(status_code=400, detail="Profile is empty")

    resume_data = request.resume_data or copy.deepcopy(profile_data)
    if request.removed_sections:
        for section in request.removed_sections:
            resume_data.pop(section, None)

    resume_data = _apply_translation(resume_data, request.language or "en")

    attach_document_id = request.attach_document_id
    if attach_document_id:
        doc = db.query(Document).filter(Document.document_id == attach_document_id).first()
        if not doc or doc.owner_user_id != current_user.user_id:
            raise HTTPException(status_code=404, detail="Document not found")
    else:
        doc = None

    resume = Resume(
        resume_id=new_id("res"),
        person_id=person.person_id,
        language=request.language or "en",
        title=request.title,
        payload=json.dumps(resume_data, ensure_ascii=False),
        source_type="profile_extract" if not person.profile_json else "profile",
        source_document_id=doc.document_id if doc else None,
        generated_document_id=doc.document_id if doc else None,
        profile_snapshot_json=json.dumps(profile_data, ensure_ascii=False),
        generation_status="generated" if doc else "ready",
        valid_until=request.valid_until,
    )
    db.add(resume)
    db.flush()

    if doc:
        doc.resume_id = resume.resume_id
        doc.document_role = "generated_resume"

    db.commit()
    db.refresh(resume)
    return _resume_response(resume)


@router.post("/resumes/{resume_id}/duplicate")
def duplicate_resume_version(
    resume_id: str,
    request: ResumeDuplicateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    person = _ensure_person(db, current_user)
    source_resume = (
        db.query(Resume)
        .filter(Resume.resume_id == resume_id, Resume.person_id == person.person_id)
        .first()
    )
    if not source_resume:
        raise HTTPException(status_code=404, detail="Resume version not found")

    resume_data = copy.deepcopy(_resume_payload(source_resume))
    if request.removed_sections:
        for section in request.removed_sections:
            resume_data.pop(section, None)
    if request.resume_data:
        resume_data = request.resume_data

    target_language = request.language or source_resume.language or "en"
    source_language = source_resume.language or "en"
    if target_language != source_language:
        resume_data = _apply_translation(resume_data, target_language)

    new_resume = Resume(
        resume_id=new_id("res"),
        person_id=person.person_id,
        language=target_language,
        title=request.title or source_resume.title,
        payload=json.dumps(resume_data, ensure_ascii=False),
        source_type="duplicate",
        source_document_id=source_resume.source_document_id,
        source_resume_id=source_resume.resume_id,
        profile_snapshot_json=source_resume.profile_snapshot_json,
        generation_status="ready",
        valid_until=request.valid_until,
    )
    db.add(new_resume)
    db.commit()
    db.refresh(new_resume)
    return _resume_response(new_resume)


@router.put("/resumes/{resume_id}")
def update_resume_version(
    resume_id: str,
    request: ResumeUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    person = _ensure_person(db, current_user)
    resume = (
        db.query(Resume)
        .filter(Resume.resume_id == resume_id, Resume.person_id == person.person_id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume version not found")

    resume.payload = json.dumps(request.resume_data, ensure_ascii=False)
    if request.language:
        resume.language = request.language
    if request.title is not None:
        resume.title = request.title

    if request.generated_document_id is not None:
        doc = db.query(Document).filter(Document.document_id == request.generated_document_id).first()
        if not doc or doc.owner_user_id != current_user.user_id:
            raise HTTPException(status_code=404, detail="Generated document not found")
        doc.resume_id = resume.resume_id
        doc.document_role = "generated_resume"
        resume.generated_document_id = doc.document_id
        resume.generation_status = "generated"

    db.commit()
    db.refresh(resume)
    return _resume_response(resume)


class SendResumeEmailRequest(BaseModel):
    to: EmailStr
    subject: str
    message: str
    pdf_base64: str
    filename: str = "resume.pdf"


@router.post("/resumes/send-email")
def send_resume_email(
    request: SendResumeEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.EMAIL_API_KEY:
        raise HTTPException(status_code=503, detail="Email service not configured")

    resend.api_key = settings.EMAIL_API_KEY

    try:
        pdf_bytes = base64.b64decode(request.pdf_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid PDF data")

    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
    sender_name = (
        f"{person.first_name} {person.last_name}".strip()
        if person and person.first_name
        else current_user.email
    )

    params: resend.Emails.SendParams = {
        "from": f"{sender_name} via HRAI <{settings.EMAIL_FROM}>",
        "to": [request.to],
        "subject": request.subject,
        "html": f"<p>{request.message.replace(chr(10), '<br>')}</p>",
        "attachments": [
            {
                "filename": request.filename,
                "content": base64.b64encode(pdf_bytes).decode(),
            }
        ],
    }

    try:
        resend.Emails.send(params)
    except Exception as e:
        logger.error("Resend error: %s", e)
        raise HTTPException(status_code=502, detail=str(e))

    return {"ok": True}


@router.get("/resumes/public/{resume_id}")
def get_public_resume(resume_id: str, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()
    if not resume:
        person = db.query(Person).filter(Person.public_url_slug == resume_id).first()
        if person:
            resume = (
                db.query(Resume)
                .filter(Resume.person_id == person.person_id)
                .order_by(Resume.created_at.desc())
                .first()
            )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {
        "title": resume.title,
        "language": resume.language,
        "resume_data": _resume_payload(resume),
    }


@router.delete("/resumes/{resume_id}")
def delete_resume_version(
    resume_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    person = _ensure_person(db, current_user)
    resume = (
        db.query(Resume)
        .filter(Resume.resume_id == resume_id, Resume.person_id == person.person_id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume version not found")

    try:
        # Use raw SQL to NULL out all FK references and delete — bypasses ORM session ordering issues
        db.execute(text("UPDATE applications SET resume_id = NULL WHERE resume_id = :rid"), {"rid": resume_id})
        db.execute(text("UPDATE documents SET resume_id = NULL WHERE resume_id = :rid"), {"rid": resume_id})
        db.execute(text("UPDATE resumes SET source_resume_id = NULL WHERE source_resume_id = :rid"), {"rid": resume_id})
        db.execute(text("DELETE FROM resumes WHERE resume_id = :rid"), {"rid": resume_id})
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error("Failed to delete resume %s: %s", resume_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Could not delete resume version")
    return {"deleted": resume_id}


@router.post("/resumes/fetch-job-url")
def fetch_job_url(
    request: FetchJobUrlRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        result = fetch_job_from_url(request.url)
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("fetch_job_from_url failed")
        raise HTTPException(status_code=500, detail=f"Failed to extract job details: {e}")


@router.post("/resumes/from-job-description")
def create_resume_from_job_description(
    request: ResumeFromJobDescriptionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    person = _ensure_person(db, current_user)
    target_language = request.language or "en"

    if request.source_resume_id:
        source_resume = (
            db.query(Resume)
            .filter(Resume.resume_id == request.source_resume_id, Resume.person_id == person.person_id)
            .first()
        )
        if not source_resume:
            raise HTTPException(status_code=404, detail="Source resume version not found")
        base_data = copy.deepcopy(_resume_payload(source_resume))
        profile_snapshot = source_resume.profile_snapshot_json
    else:
        profile_data = _profile_payload(person, current_user)
        base_data = copy.deepcopy(profile_data)
        profile_snapshot = json.dumps(profile_data, ensure_ascii=False)

    # Remove excluded sections
    if request.removed_sections:
        for section in request.removed_sections:
            base_data.pop(section, None)

    try:
        resume_data = adapt_resume_for_job(base_data, request.job_description, target_language)
    except Exception as e:
        logger.warning(f"adapt_resume_for_job failed ({e}), falling back to translation-only")
        resume_data = _apply_translation(base_data, target_language)

    resume = Resume(
        resume_id=new_id("res"),
        person_id=person.person_id,
        language=target_language,
        title=request.title,
        payload=json.dumps(resume_data, ensure_ascii=False),
        source_type="job_description",
        source_resume_id=request.source_resume_id,
        profile_snapshot_json=profile_snapshot,
        generation_status="ready",
        valid_until=request.valid_until,
        job_description=request.job_description,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return _resume_response(resume)
