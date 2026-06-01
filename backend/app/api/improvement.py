from __future__ import annotations

import json
from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.api.helpers.extract import extract_cv_text, sha256_bytes
from backend.app.schemas import CVImprovementResult
from backend.app.pipeline import run_cv_improvement

from backend.database.db import get_db
from backend.database.models import Document, CVImprovementResult as CVImprovementResultDB, User, Person, Resume
from backend.database.storage import new_id
from backend.app.api.helpers.ownership import get_current_user
from backend.app.api.helpers.quota import consume_ai_quota

router = APIRouter()


class ImprovementHistoryItem(BaseModel):
    improvement_id: str
    filename: Optional[str]
    overall_score: int
    created_at: datetime
    full_result_json: str


@router.get("/improve-cv-history", response_model=List[ImprovementHistoryItem])
def get_improvement_history(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    results = (
        db.query(CVImprovementResultDB)
        .filter(CVImprovementResultDB.owner_user_id == current_user.user_id)
        .order_by(CVImprovementResultDB.created_at.desc())
        .limit(50)
        .all()
    )
    return results


@router.delete("/improve-cv-history/{improvement_id}")
def delete_improvement_history(
        improvement_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    record = db.query(CVImprovementResultDB).filter(
        CVImprovementResultDB.improvement_id == improvement_id,
        CVImprovementResultDB.owner_user_id == current_user.user_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="History item not found")
    db.delete(record)
    db.commit()
    return {"status": "deleted"}


@router.post("/improve-cv-file", response_model=CVImprovementResult)
async def improve_cv_file(
        file: UploadFile = File(...),
        job_description: str = Form(""),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    data = await file.read()

    try:
        cv_text, content_type = extract_cv_text(file.filename or "", data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    consume_ai_quota(db, current_user)

    file_hash = sha256_bytes(data)

    db_document = Document(
        document_id=new_id("doc"),
        owner_user_id=current_user.user_id,
        filename=file.filename or "unknown",
        content_type=content_type,
        file_hash=file_hash,
        raw_text=cv_text,
        source_type="improve_cv",
    )
    db.add(db_document)
    db.flush()

    try:
        result = run_cv_improvement(
            cv_text=cv_text,
            job_description=job_description,
        )
    except Exception as e:
        if current_user.ai_used > 0:
            current_user.ai_used -= 1
            db.commit()
        raise HTTPException(status_code=500, detail=f"AI Improvement failed: {str(e)}")

    db_result = CVImprovementResultDB(
        improvement_id=new_id("imp"),
        owner_user_id=current_user.user_id,
        document_id=db_document.document_id,
        filename=file.filename or "unknown",
        overall_score=result.overall_score,
        full_result_json=result.model_dump_json(),
    )

    db.add(db_result)
    db.commit()

    return result


@router.post("/improve-cv-existing", response_model=CVImprovementResult)
async def improve_cv_existing(
        resume_id: str = Form(...),
        job_description: str = Form(""),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
    if not person:
        raise HTTPException(status_code=400, detail="Profile not found")

    resume = db.query(Resume).filter(
        Resume.resume_id == resume_id,
        Resume.person_id == person.person_id
    ).first()

    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    cv_text = ""

    if resume.payload and len(resume.payload.strip()) > 10:
        cv_text = str(resume.payload)

    if not cv_text and resume.source_document_id:
        doc = db.query(Document).filter(Document.document_id == resume.source_document_id).first()
        if doc and doc.raw_text:
            cv_text = doc.raw_text

    if not cv_text or not cv_text.strip():
        raise HTTPException(status_code=400, detail="The resume content is empty and cannot be improved.")

    filename = resume.title or "Existing_CV"

    consume_ai_quota(db, current_user)

    file_hash = sha256_bytes(cv_text.encode('utf-8'))

    db_document = Document(
        document_id=new_id("doc"),
        owner_user_id=current_user.user_id,
        filename=filename,
        content_type="text/plain",
        file_hash=file_hash,
        raw_text=cv_text,
        source_type="improve_cv_existing",
    )
    db.add(db_document)
    db.flush()

    try:
        result = run_cv_improvement(
            cv_text=cv_text,
            job_description=job_description,
        )
    except Exception as e:
        if current_user.ai_used > 0:
            current_user.ai_used -= 1
            db.commit()
        raise HTTPException(status_code=500, detail=f"AI Improvement failed: {str(e)}")

    db_result = CVImprovementResultDB(
        improvement_id=new_id("imp"),
        owner_user_id=current_user.user_id,
        document_id=db_document.document_id,
        filename=filename,
        overall_score=result.overall_score,
        full_result_json=result.model_dump_json(),
    )

    db.add(db_result)
    db.commit()

    return result


class BulletRewrite(BaseModel):
    original: str
    improved: str


class GenerateVersionRequest(BaseModel):
    resume_id: str
    accepted_summary: Optional[str] = None
    accepted_keywords: List[str] = []
    accepted_improvements: List[str] = []
    accepted_bullets: List[BulletRewrite] = []


@router.post("/improve-cv-generate-version")
def generate_improved_version(
        body: GenerateVersionRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
    if not person:
        raise HTTPException(status_code=400, detail="Profile not found")

    resume = db.query(Resume).filter(
        Resume.resume_id == body.resume_id,
        Resume.person_id == person.person_id,
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    try:
        data: Dict[str, Any] = json.loads(resume.payload) if resume.payload else {}
    except (json.JSONDecodeError, TypeError):
        data = {}

    if body.accepted_summary:
        data.setdefault("personal_info", {})
        data["personal_info"]["summary"] = body.accepted_summary

    if body.accepted_keywords:
        existing_names = {
            (s if isinstance(s, str) else s.get("name", "")).lower()
            for s in data.get("skills", [])
        }
        for kw in body.accepted_keywords:
            if kw.lower() not in existing_names:
                data.setdefault("skills", []).append({"name": kw, "level": "BEGINNER", "years_of_experience": 0})
                existing_names.add(kw.lower())

    if body.accepted_bullets:
        for exp in data.get("experience", []):
            desc = exp.get("description", "") or ""
            for bullet in body.accepted_bullets:
                if bullet.original in desc:
                    desc = desc.replace(bullet.original, bullet.improved, 1)
            exp["description"] = desc

    new_resume = Resume(
        resume_id=new_id("res"),
        person_id=person.person_id,
        title=f"{resume.title or 'Resume'} (Improved)",
        language=resume.language or "en",
        source_type="duplicate",
        source_resume_id=resume.resume_id,
        payload=json.dumps(data, ensure_ascii=False),
        generation_status="ready",
    )
    db.add(new_resume)
    db.commit()
    db.refresh(new_resume)

    return {"resume_id": new_resume.resume_id, "title": new_resume.title}