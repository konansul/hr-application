import hashlib
import json
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session

from backend.app.schemas import ScreeningRequest, ScreeningResult
from backend.app.api.models import ScreeningStatusUpdate
from backend.app.pipeline import run_screening
from backend.app.services.parsing.pdf import pdf_to_text
from backend.app.services.parsing.docx import docx_to_text
from backend.app.services.parsing.clean import clean_text

from backend.database.db import get_db
from backend.database.models import Document, ScreeningResult as ScreeningResultDB, User
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


@router.post("/run-file", response_model=ScreeningResult)
async def run_file(
        job_description: str = Form(...),
        job_id: Optional[str] = Form(None),
        file: UploadFile = File(...),
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
        source_type="screen_cv",
    )
    db.add(db_document)
    db.flush()

    request = ScreeningRequest(cv_text=cv_text, job_description=job_description)
    result = run_screening(request)

    matched_skills = result.matched_skills if result.matched_skills else []
    missing_skills = result.missing_skills if result.missing_skills else []
    risks = result.risks if result.risks else []

    db_result = ScreeningResultDB(
        result_id=new_id("scr"),
        owner_user_id=current_user.user_id,
        job_id=job_id,
        document_id=db_document.document_id,
        filename=file.filename or "unknown",
        candidate_name=None,
        score=result.score,
        decision=result.decision,
        status="New",
        summary=result.summary,
        matched_skills_json=json.dumps(matched_skills, ensure_ascii=False),
        missing_skills_json=json.dumps(missing_skills, ensure_ascii=False),
        risks_json=json.dumps(risks, ensure_ascii=False),
        full_result_json=result.model_dump_json(),
    )

    db.add(db_result)
    db.commit()
    db.refresh(db_result)

    # Добавляем ID из базы в объект результата перед возвратом
    result_dict = result.model_dump()
    result_dict["result_id"] = db_result.result_id
    result_dict["status"] = db_result.status

    return result_dict


@router.patch("/results/{result_id}/status")
def update_screening_status(
        result_id: str,
        update: ScreeningStatusUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    result = (
        db.query(ScreeningResultDB)
        .join(User, ScreeningResultDB.owner_user_id == User.user_id)
        .filter(
            ScreeningResultDB.result_id == result_id,
            User.org_id == current_user.org_id
        )
        .first()
    )
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    result.status = update.status
    db.commit()
    return {"ok": True, "new_status": result.status}


@router.get("/results/job/{job_id}")
def list_results_by_job(
        job_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    results = (
        db.query(ScreeningResultDB)
        .join(User, ScreeningResultDB.owner_user_id == User.user_id)
        .filter(
            ScreeningResultDB.job_id == job_id,
            User.org_id == current_user.org_id
        )
        .order_by(ScreeningResultDB.created_at.desc())
        .all()
    )
    return results