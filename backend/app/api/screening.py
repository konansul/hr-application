from __future__ import annotations

import hashlib
import json
from typing import Optional, List

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.schemas import ScreeningRequest, JobRequirementsBase
from backend.app.pipeline import run_screening, run_cv_parsing
from backend.app.services.parsing.pdf import pdf_to_text
from backend.app.services.parsing.docx import docx_to_text
from backend.app.services.parsing.clean import clean_text

from backend.database.db import get_db
from backend.database.models import Document, ScreeningResult, User, Job, Application, Person, Resume
from backend.database.storage import new_id
from backend.app.api.helpers.ownership import get_current_user

# ИМПОРТИРУЕМ ФУНКЦИЮ ЛИМИТОВ
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

    # ПРОВЕРЯЕМ И СПИСЫВАЕМ КВОТУ ПЕРЕД НАЧАЛОМ РАБОТЫ ИИ
    consume_ai_quota(db, current_user)

    try:
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

        req_obj = None
        if job.requirements:
            try:
                req_data = json.loads(job.requirements) if isinstance(job.requirements, str) else job.requirements
                req_obj = JobRequirementsBase(**req_data)
            except Exception as e:
                print(f"Warning: Could not parse job requirements: {e}")

        request = ScreeningRequest(
            cv_text=resume.payload,
            job_description=job.description,
            requirements=req_obj
        )

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
    except Exception as e:
        db.rollback()
        # ВОЗВРАЩАЕМ ПОПЫТКУ, ЕСЛИ ИИ УПАЛ С ОШИБКОЙ
        if current_user.ai_used > 0:
            current_user.ai_used -= 1
            db.commit()
        raise HTTPException(status_code=500, detail=f"AI Screening failed: {str(e)}")


class ApplicationStatusUpdate(BaseModel):
    status: str


@router.patch("/applications/{application_id}/status")
def update_application_status(
        application_id: str,
        update: ApplicationStatusUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    if current_user.role == "hr":
        app = db.query(Application).join(Job).filter(
            Application.application_id == application_id,
            Job.org_id == current_user.org_id
        ).first()
    else:
        person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
        app = db.query(Application).join(Job).filter(
            Application.application_id == application_id,
            Job.owner_user_id == current_user.user_id,
            Application.person_id == (person.person_id if person else None)
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
    document_ids: List[str]
    job_id: str
    job_description: str


@router.post("/screening/bulk")
def bulk_screen(
        req: BulkScreenRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can run screening")

    job = db.query(Job).filter(Job.job_id == req.job_id, Job.org_id == current_user.org_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found in your organization")

    if not req.document_ids:
        raise HTTPException(status_code=400, detail="No items selected for screening")

    results_to_return = []

    req_obj = None
    if job.requirements:
        try:
            req_data = json.loads(job.requirements) if isinstance(job.requirements, str) else job.requirements
            req_obj = JobRequirementsBase(**req_data)
        except Exception as e:
            print(f"Warning: Could not parse job requirements: {e}")

    for item_id in req.document_ids:
        # 1. Пытаемся списать квоту
        try:
            consume_ai_quota(db, current_user)
        except HTTPException as e:
            if e.status_code == 429:
                print("Daily AI limit reached during bulk screen. Stopping early.")
                break
            raise e

        try:
            # 2. УМНЫЙ ПОИСК РЕЗЮМЕ (Поддерживаем и старые doc_id, и новые res_id)
            resume = None
            filename = "Unknown_Resume.pdf"

            if item_id.startswith("res_"):
                resume = db.query(Resume).filter(Resume.resume_id == item_id).first()
            elif item_id.startswith("virtual_res_") or item_id.startswith("virtual_"):
                clean_id = item_id.replace("virtual_res_", "").replace("virtual_", "")
                resume = db.query(Resume).filter(Resume.resume_id == clean_id).first()
            else:
                # Если это старый формат (doc_id)
                doc = db.query(Document).filter(Document.document_id == item_id).first()
                if doc:
                    filename = doc.filename
                    # Находим резюме, к которому привязан этот документ
                    resume = db.query(Resume).filter(
                        (Resume.source_document_id == doc.document_id) |
                        (Resume.generated_document_id == doc.document_id)
                    ).first()

            if not resume:
                print(f"AI Screening skipped for {item_id}: No Resume found.")
                # Возвращаем квоту, так как скрининг не состоялся
                if current_user.ai_used > 0:
                    current_user.ai_used -= 1
                    db.commit()
                continue

            if resume.title:
                filename = resume.title

            cv_text_for_ai = resume.payload

            # 3. ИЩЕМ ИЛИ СОЗДАЕМ ОТКЛИК (Application)
            app = db.query(Application).filter(
                Application.job_id == job.job_id,
                Application.person_id == resume.person_id
            ).first()

            if not app:
                app = Application(
                    application_id=new_id("app"),
                    job_id=job.job_id,
                    person_id=resume.person_id,
                    resume_id=resume.resume_id,
                    status="APPLIED"
                )
                db.add(app)
                db.flush()

            # 4. УДАЛЯЕМ СТАРЫЕ РЕЗУЛЬТАТЫ И ЗАПУСКАЕМ ИИ
            db.query(ScreeningResult).filter(ScreeningResult.application_id == app.application_id).delete()
            db.flush()

            request = ScreeningRequest(
                cv_text=cv_text_for_ai,
                job_description=req.job_description,
                requirements=req_obj
            )

            ai_result = run_screening(request)
            ai_data = ai_result.model_dump() if hasattr(ai_result, 'model_dump') else ai_result

            db_res = ScreeningResult(
                result_id=new_id("scr"),
                application_id=app.application_id,
                score=ai_data.get("score", 0),
                decision=ai_data.get("decision", "maybe"),
                full_result_json=json.dumps(ai_data, ensure_ascii=False),
            )
            db.add(db_res)
            db.flush()

            results_to_return.append({
                "application_id": app.application_id,
                "result_id": db_res.result_id,
                "filename": filename,
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

        except Exception as e:
            print(f"AI Screening failed for {item_id}: {e}")
            db.rollback()
            if current_user.ai_used > 0:
                current_user.ai_used -= 1
                db.commit()
            continue

    db.commit()
    return results_to_return


@router.get("/applications/organization")
def list_all_organization_applications(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
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


@router.delete("/applications/{application_id}")
def delete_application(
        application_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can delete applications")

    app = db.query(Application).join(Job).filter(
        Application.application_id == application_id,
        Job.org_id == current_user.org_id
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    db.delete(app)
    db.commit()
    return {"ok": True}


class ApplyRequest(BaseModel):
    job_id: str
    resume_id: Optional[str] = None
    answers: Optional[dict] = None


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

    # --- ЛОГИКА ВЫБОРА РЕЗЮМЕ ---
    if req.resume_id:
        # Если фронтенд прислал ID, ищем именно это резюме
        resume = db.query(Resume).filter(
            Resume.resume_id == req.resume_id,
            Resume.person_id == person.person_id
        ).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Selected resume not found")
    else:
        # Fallback: если ID не пришел, берем самое последнее (как было раньше)
        resume = db.query(Resume).filter(
            Resume.person_id == person.person_id
        ).order_by(Resume.created_at.desc()).first()

    if not resume:
        raise HTTPException(status_code=400, detail="Please upload your CV before applying")
    # ---------------------------

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
        resume_id=resume.resume_id, # Используем ID найденного выше резюме
        status="APPLIED",
        answers_to_screening_json=json.dumps(req.answers, ensure_ascii=False) if req.answers else None
    )

    db.add(new_application)
    db.commit()
    db.refresh(new_application)

    return {
        "status": "success",
        "application_id": new_application.application_id,
        "message": "Application submitted successfully"
    }


@router.get("/applications/answers")
def get_candidate_answers(
        owner_user_id: str,
        job_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role != "hr" or not current_user.org_id:
        raise HTTPException(status_code=403, detail="Only HR with an organization can view answers")

    job = db.query(Job).filter(
        Job.job_id == job_id,
        Job.org_id == current_user.org_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found or access denied")

    questions = json.loads(job.screening_questions_json) if job and job.screening_questions_json else []

    person = db.query(Person).filter(Person.user_id == owner_user_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Candidate not found")

    app = db.query(Application).filter(
        Application.person_id == person.person_id,
        Application.job_id == job_id
    ).first()

    if not app:
        return {"answers": None, "questions": questions}

    answers = json.loads(app.answers_to_screening_json) if app.answers_to_screening_json else None
    return {"answers": answers, "questions": questions}


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
            "job_title": app.job.title if app.job else None,
            "job_region": app.job.region if app.job else None,
            "job_owner_user_id": app.job.owner_user_id if app.job else None,
            "status": app.status,
            "created_at": app.created_at,
            "screening": {
                "score": scr.score if scr else None,
                "decision": scr.decision if scr else None
            } if scr else None
        })
    return out


@router.get("/screening/results/{job_id}")
def get_job_screening_results(
        job_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    # Проверяем, что вакансия принадлежит организации HR
    job = db.query(Job).filter(Job.job_id == job_id, Job.org_id == current_user.org_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Ищем все отклики с результатами скрининга
    apps = (
        db.query(Application, ScreeningResult, Resume)
        .join(ScreeningResult, ScreeningResult.application_id == Application.application_id)
        .join(Resume, Resume.resume_id == Application.resume_id)
        .filter(Application.job_id == job_id)
        .all()
    )

    results = []
    for app, scr, res in apps:
        full_res = json.loads(scr.full_result_json)
        results.append({
            "application_id": app.application_id,
            "filename": res.title or "Resume",
            "score": scr.score,
            "decision": scr.decision,
            "summary": full_res.get("summary"),
            "matched_skills": full_res.get("matched_skills", []),
            "missing_skills": full_res.get("missing_skills", []),
            "risks": full_res.get("risks", []),
        })

    return results