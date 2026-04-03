from __future__ import annotations

import hashlib
import json
from typing import Optional, List

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.schemas import ScreeningRequest
from backend.app.pipeline import run_screening, run_cv_parsing
from backend.app.services.parsing.pdf import pdf_to_text
from backend.app.services.parsing.docx import docx_to_text
from backend.app.services.parsing.clean import clean_text

from backend.database.db import get_db
from backend.database.models import Document, ScreeningResult, User, Job, Application, Person, Resume
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

@router.post("/screening/run-file")
async def run_file(
        job_id: str = Form(...),
        file: UploadFile = File(...),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can use this endpoint")

    job = db.query(Job).filter(Job.job_id == job_id, Job.org_id == current_user.org_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    data = await file.read()
    try:
        cv_text, content_type = extract_cv_text(file.filename or "", data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    parsed_data = run_cv_parsing(cv_text)

    person = Person(
        person_id=new_id("prs"),
        user_id=current_user.user_id,
        first_name=parsed_data.get("personal_info", {}).get("first_name", "Unknown"),
        last_name=parsed_data.get("personal_info", {}).get("last_name", "Unknown"),
        city=parsed_data.get("personal_info", {}).get("city")
    )
    db.add(person)
    db.flush()

    resume = Resume(
        resume_id=new_id("res"),
        person_id=person.person_id,
        payload=json.dumps(parsed_data, ensure_ascii=False)
    )
    db.add(resume)
    db.flush()

    application = Application(
        application_id=new_id("app"),
        job_id=job.job_id,
        person_id=person.person_id,
        resume_id=resume.resume_id,
        status="Applied"
    )
    db.add(application)
    db.flush()

    request = ScreeningRequest(cv_text=resume.payload, job_description=job.description)
    ai_result = run_screening(request)

    db_result = ScreeningResult(
        result_id=new_id("scr"),
        application_id=application.application_id,
        score=ai_result.score,
        decision=ai_result.decision,
        full_result_json=ai_result.model_dump_json(),
    )

    db.add(db_result)
    db.commit()

    return {
        "application_id": application.application_id,
        "result_id": db_result.result_id,
        "score": db_result.score,
        "decision": db_result.decision,
        "full_result": json.loads(db_result.full_result_json)
    }

class ApplicationStatusUpdate(BaseModel):
    status: str

@router.patch("/applications/{application_id}/status")
def update_application_status(
        application_id: str,
        update: ApplicationStatusUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    app = db.query(Application).join(Job).filter(
        Application.application_id == application_id,
        Job.org_id == current_user.org_id
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.status = update.status
    db.commit()
    return {"ok": True, "new_status": app.status}

@router.get("/applications/job/{job_id}")
def list_applications_by_job(
        job_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    apps = db.query(Application).join(Job).filter(
        Application.job_id == job_id,
        Job.org_id == current_user.org_id
    ).order_by(Application.created_at.desc()).all()

    out = []
    for app in apps:
        scr = app.screening_result
        out.append({
            "application_id": app.application_id,
            "status": app.status,
            "created_at": app.created_at,
            "person": {
                "first_name": app.person.first_name,
                "last_name": app.person.last_name,
                "phone": app.person.phone
            },
            "screening": {
                "score": scr.score if scr else None,
                "decision": scr.decision if scr else None,
                "full_result": json.loads(scr.full_result_json) if scr else None
            } if scr else None
        })
    return out


class BulkScreenRequest(BaseModel):
    document_ids: List[str]      # Проверь: на фронте это document_ids
    job_id: str                 # Проверь: на фронте это job_id
    job_description: str        # Проверь: на фронте это job_description


@router.post("/screening/bulk")
def bulk_screen(
        req: BulkScreenRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can run screening")

    # 1. Проверка существования вакансии
    job = db.query(Job).filter(Job.job_id == req.job_id, Job.org_id == current_user.org_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found in your organization")

    # 2. Получение документов
    docs = db.query(Document).filter(Document.document_id.in_(req.document_ids)).all()
    if not docs:
        raise HTTPException(status_code=404, detail="No documents found")

    results_to_return = []

    for doc in docs:
        # Ищем владельца документа (кандидата)
        person = db.query(Person).filter(Person.user_id == doc.owner_user_id).first()

        # Ищем последнее распарсенное резюме, если оно есть
        resume = db.query(Resume).filter(Resume.person_id == person.person_id).order_by(
            Resume.created_at.desc()).first() if person else None

        # Определяем текст для AI (приоритет у распарсенного резюме, иначе берем raw_text документа)
        cv_text_for_ai = resume.payload if resume else doc.raw_text

        # Ищем или создаем Application (отклик)
        app = db.query(Application).filter(
            Application.job_id == job.job_id,
            Application.person_id == (person.person_id if person else None)
        ).first()

        if not app:
            app = Application(
                application_id=new_id("app"),
                job_id=job.job_id,
                person_id=person.person_id if person else None,
                resume_id=resume.resume_id if resume else None,
                status="APPLIED"
            )
            db.add(app)
            db.flush()

        # Удаляем старые результаты скрининга для этого отклика, чтобы не плодить дубликаты
        db.query(ScreeningResult).filter(ScreeningResult.application_id == app.application_id).delete()
        db.flush()

        # 3. Запуск AI скрининга
        request = ScreeningRequest(cv_text=cv_text_for_ai, job_description=req.job_description)
        try:
            ai_result = run_screening(request)
            # Превращаем результат Pydantic в обычный Python словарь
            ai_data = ai_result.model_dump() if hasattr(ai_result, 'model_dump') else ai_result
        except Exception as e:
            print(f"AI Screening failed for {doc.filename}: {e}")
            continue

        # 4. Сохранение результата в базу данных
        # Используем json.dumps для корректного хранения в текстовом поле full_result_json
        db_res = ScreeningResult(
            result_id=new_id("scr"),
            application_id=app.application_id,
            score=ai_data.get("score", 0),
            decision=ai_data.get("decision", "maybe"),
            full_result_json=json.dumps(ai_data, ensure_ascii=False),
        )
        db.add(db_res)
        db.flush()

        # 5. Формируем чистый объект ответа для фронтенда
        results_to_return.append({
            "application_id": app.application_id,
            "result_id": db_res.result_id,
            "filename": doc.filename,
            "score": db_res.score,
            "decision": db_res.decision,
            "status": "Completed",
            "summary": ai_data.get("summary", ""),
            "matched_skills": ai_data.get("matched_skills", []),
            "missing_skills": ai_data.get("missing_skills", []),
            "risks": ai_data.get("risks", []),
            "interview_questions": ai_data.get("interview_questions", []),
            "recommendations": ai_data.get("recommendations", []),
            "full_result": ai_data
        })

    print(results_to_return)
    db.commit()
    return results_to_return

@router.get("/applications/organization")
def list_all_organization_applications(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    # if current_user.role != "hr":
    #     raise HTTPException(status_code=403, detail="Only HR can view all applications")

    apps = db.query(Application).join(Job).filter(
        Job.org_id == current_user.org_id
    ).order_by(Application.created_at.desc()).all()

    out = []
    for app in apps:
        scr = app.screening_result
        out.append({
            "application_id": app.application_id,
            "job_id": app.job.job_id,
            "job_title": app.job.title,
            "status": app.status,
            "created_at": app.created_at,
            "person": {
                "first_name": app.person.first_name,
                "last_name": app.person.last_name,
            },
            "screening": {
                "score": scr.score if scr else None,
                "decision": scr.decision if scr else None,
                "full_result": json.loads(scr.full_result_json) if scr else None
            } if scr else None
        })
    return out

class ApplyRequest(BaseModel):
    job_id: str

@router.post("/applications/apply")
def apply_to_job(
        req: ApplyRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can apply to jobs")

    job = db.query(Job).filter(Job.job_id == req.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")


    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
    if not person:
        raise HTTPException(status_code=400, detail="Please complete your profile first")

    resume = db.query(Resume).filter(Resume.person_id == person.person_id).order_by(Resume.created_at.desc()).first()
    if not resume:
        raise HTTPException(status_code=400, detail="Please upload your CV before applying")

    existing_app = db.query(Application).filter(
        Application.job_id == req.job_id,
        Application.person_id == person.person_id
    ).first()

    if existing_app:
        raise HTTPException(status_code=400, detail="You have already applied for this position")

    new_application = Application(
        application_id=new_id("app"),
        job_id=req.job_id,
        person_id=person.person_id,
        resume_id=resume.resume_id,
        status="APPLIED"
    )

    db.add(new_application)
    db.commit()
    db.refresh(new_application)

    return {
        "status": "success",
        "application_id": new_application.application_id,
        "message": "Application submitted successfully"
    }


@router.get("/applications/my")
def get_my_applications(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
    if not person:
        return []

    apps = db.query(Application).filter(Application.person_id == person.person_id).all()

    out = []
    for app in apps:
        scr = app.screening_result

        out.append({
            "application_id": app.application_id,
            "job_id": app.job_id,
            "status": app.status,
            "created_at": app.created_at,
            "screening": {
                "score": scr.score if scr else None,
                "decision": scr.decision if scr else None
            } if scr else None
        })
    return out