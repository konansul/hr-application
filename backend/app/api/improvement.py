from __future__ import annotations

import hashlib

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session

from backend.app.schemas import CVImprovementResult
from backend.app.pipeline import run_cv_improvement
from backend.app.services.parsing.pdf import pdf_to_text
from backend.app.services.parsing.docx import docx_to_text
from backend.app.services.parsing.clean import clean_text

from backend.database.db import get_db
from backend.database.models import (
    Document,
    CVImprovementResult as CVImprovementResultDB,
    User,
    Person,
    Resume
)
from backend.database.storage import new_id
from backend.app.api.helpers.ownership import get_current_user
from backend.app.api.helpers.quota import consume_ai_quota

router = APIRouter()

def extract_cv_text(filename: str, data: bytes) -> tuple[str, str]:
    filename = (filename or "").lower()

    if filename.endswith(".pdf"):
        cv_text = pdf_to_text(data)
        content_type = "application/pdf"
    elif filename.endswith(".docx"):
        cv_text = docx_to_text(data)
        content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif filename.endswith(".txt"):
        cv_text = data.decode("utf-8", errors="ignore")
        content_type = "text/plain"
    else:
        raise ValueError("Supported formats: .pdf, .docx, .txt")

    cv_text = clean_text(cv_text)

    if not cv_text:
        raise ValueError("Could not extract text from file")

    return cv_text, content_type

def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

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

    doc_id = resume.generated_document_id or resume.source_document_id
    doc = db.query(Document).filter(Document.document_id == doc_id).first() if doc_id else None

    cv_text = doc.raw_text if doc else str(resume.payload)
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