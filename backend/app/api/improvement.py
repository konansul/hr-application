import hashlib
import json

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
)
from backend.database.storage import new_id
from backend.app.api.helpers.ownership import get_current_user

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
    db.commit()
    db.refresh(db_document)

    result = run_cv_improvement(
        cv_text=cv_text,
        job_description=job_description,
    )

    strengths = result.strengths if result.strengths else []
    weaknesses = result.weaknesses if result.weaknesses else []
    missing_keywords = result.missing_keywords if result.missing_keywords else []
    improvements = result.improvements if result.improvements else []

    rewritten_bullets = []
    if result.rewritten_bullets:
        rewritten_bullets = [
            {
                "original": item.original,
                "improved": item.improved,
            }
            for item in result.rewritten_bullets
        ]

    db_result = CVImprovementResultDB(
        improvement_id=new_id("imp"),
        owner_user_id=current_user.user_id,
        document_id=db_document.document_id,
        filename=file.filename or "unknown",
        overall_score=result.overall_score,
        summary=result.summary,
        strengths_json=json.dumps(strengths, ensure_ascii=False),
        weaknesses_json=json.dumps(weaknesses, ensure_ascii=False),
        missing_keywords_json=json.dumps(missing_keywords, ensure_ascii=False),
        improvements_json=json.dumps(improvements, ensure_ascii=False),
        improved_summary=result.improved_summary,
        rewritten_bullets_json=json.dumps(rewritten_bullets, ensure_ascii=False),
        full_result_json=result.model_dump_json(),
    )

    db.add(db_result)
    db.commit()

    return result