import hashlib
import json
from typing import Optional, List

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.schemas import ScreeningRequest, ScreeningResult
from backend.app.api.models import ScreeningStatusUpdate
from backend.app.pipeline import run_screening
from backend.app.services.parsing.pdf import pdf_to_text
from backend.app.services.parsing.docx import docx_to_text
from backend.app.services.parsing.clean import clean_text
from backend.database.models import Job

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


class BulkScreenRequest(BaseModel):
    document_ids: List[str]
    job_description: str
    job_id: str


@router.post("/screening/bulk")
def bulk_screen(
        req: BulkScreenRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can run screening")

    documents = db.query(Document).filter(Document.document_id.in_(req.document_ids)).all()

    if not documents:
        raise HTTPException(status_code=404, detail="No valid documents found")

    results_to_return = []

    for doc in documents:
        request = ScreeningRequest(cv_text=doc.raw_text, job_description=req.job_description)
        ai_result = run_screening(request)

        matched_skills = ai_result.matched_skills if ai_result.matched_skills else []
        missing_skills = ai_result.missing_skills if ai_result.missing_skills else []
        risks = ai_result.risks if ai_result.risks else []
        interview_questions = ai_result.interview_questions if ai_result.interview_questions else []

        res = ScreeningResultDB(
            result_id=new_id("scr"),
            owner_user_id=current_user.user_id,
            job_id=req.job_id,
            document_id=doc.document_id,
            filename=doc.filename,
            score=ai_result.score,
            decision=ai_result.decision,
            status="New",
            summary=ai_result.summary,
            matched_skills_json=json.dumps(matched_skills, ensure_ascii=False),
            missing_skills_json=json.dumps(missing_skills, ensure_ascii=False),
            risks_json=json.dumps(risks, ensure_ascii=False),
            full_result_json=ai_result.model_dump_json(),
        )
        db.add(res)

        results_to_return.append({
            "result_id": res.result_id,
            "document_id": res.document_id,
            "filename": res.filename,
            "status": res.status,
            "score": res.score,
            "decision": res.decision,
            "summary": res.summary,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "risks": risks,
            "interview_questions": interview_questions
        })

    db.commit()
    return results_to_return


@router.get("/results/organization")
def list_all_organization_results(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can view all results")

    results = (
        db.query(ScreeningResultDB, Job.title)
        .join(User, ScreeningResultDB.owner_user_id == User.user_id)
        .outerjoin(Job, ScreeningResultDB.job_id == Job.job_id)
        .filter(User.org_id == current_user.org_id)
        .order_by(ScreeningResultDB.created_at.desc())
        .all()
    )

    out = []
    for r in results:
        interview_qs = []
        if r[0].full_result_json:
            try:
                parsed = json.loads(r[0].full_result_json)
                interview_qs = parsed.get("interview_questions", [])
            except:
                pass

        out.append({
            "result_id": r[0].result_id,
            "document_id": r[0].document_id,
            "filename": r[0].filename,
            "job_id": r[0].job_id,
            "job_title": r[1] or "Deleted / Unknown Job",
            "score": r[0].score,
            "decision": r[0].decision,
            "status": r[0].status,
            "summary": r[0].summary,
            "created_at": r[0].created_at,
            "matched_skills": json.loads(r[0].matched_skills_json) if r[0].matched_skills_json else [],
            "missing_skills": json.loads(r[0].missing_skills_json) if r[0].missing_skills_json else [],
            "risks": json.loads(r[0].risks_json) if r[0].risks_json else [],
            "interview_questions": interview_qs
        })
    return out