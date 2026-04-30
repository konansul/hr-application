from __future__ import annotations

import hashlib
import json
from typing import Optional, List

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.api.helpers.extract import extract_cv_text
from backend.app.pipeline import run_cv_parsing

from backend.database.db import get_db
from backend.database.models import Document, User, Job, Application, Person, Resume
from backend.database.storage import new_id
from backend.app.api.helpers.ownership import get_current_user
router = APIRouter()

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

    if req.resume_id:
        resume = db.query(Resume).filter(
            Resume.resume_id == req.resume_id,
            Resume.person_id == person.person_id
        ).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Selected resume not found")
    else:
        resume = db.query(Resume).filter(
            Resume.person_id == person.person_id
        ).order_by(Resume.created_at.desc()).first()

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

@router.post("/applications/submit")
async def submit_public_application(
        name: str = Form(...),
        email: str = Form(...),
        job_id: str = Form(...),
        file: UploadFile = File(...),
        phone: str = Form(None),
        motivation: str = Form(None),
        position: str = Form(None),
        # salary_expectation: str = Form(None),
        # education: str = Form(None),
        skills: str = Form(None),
        # experience_years: str = Form(None),
        db: Session = Depends(get_db)
):
    content = await file.read()

    try:
        cv_text, doc_content_type = extract_cv_text(file.filename or "", content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            user_id=new_id("usr"),
            email=email,
            password_hash="no_login_public_user",
            role="candidate"
        )
        db.add(user)
        db.flush()

    enriched_raw_text = f"""
CANDIDATE PUBLIC APPLICATION
---------------------------
Job ID: {job_id}
Name: {name}
Email: {email}
Phone: {phone or 'Not provided'}
Motivation: {motivation or 'Not provided'}
Additional Info: {position or ''} {skills or ''}

ORIGINAL CV TEXT:
{cv_text}
"""

    try:
        parsed_data = run_cv_parsing(enriched_raw_text)
    except Exception:
        parsed_data = {}

    person = db.query(Person).filter(Person.user_id == user.user_id).first()
    personal_info = parsed_data.get("personal_info", {})

    if not person:
        name_parts = name.split(" ", 1)
        f_name = personal_info.get("first_name") or name_parts[0]
        l_name = personal_info.get("last_name") or (name_parts[1] if len(name_parts) > 1 else "Unknown")

        person = Person(
            person_id=new_id("prs"),
            user_id=user.user_id,
            first_name=f_name,
            last_name=l_name,
            phone=phone or personal_info.get("phone")
        )
        db.add(person)
        db.flush()

    file_hash = hashlib.sha256(content).hexdigest()
    doc = Document(
        document_id=new_id("doc"),
        owner_user_id=user.user_id,
        filename=file.filename,
        content_type=doc_content_type,
        file_hash=file_hash,
        raw_text=enriched_raw_text,
        source_type="public_application",
        document_role="source_cv"
    )
    db.add(doc)
    db.flush()

    resume = Resume(
        resume_id=new_id("res"),
        person_id=person.person_id,
        language=parsed_data.get("language") or "en",
        title=f"CV: {name} - {file.filename}",
        payload=json.dumps(parsed_data, ensure_ascii=False),
        source_type="public_application",
        source_document_id=doc.document_id,
        generated_document_id=doc.document_id,
        generation_status="generated"
    )
    db.add(resume)
    db.flush()

    new_application = Application(
        application_id=new_id("app"),
        job_id=job_id,
        person_id=person.person_id,
        resume_id=resume.resume_id,
        status="APPLIED"
    )
    db.add(new_application)

    db.commit()

    return {
        "status": "success",
        "resume_id": resume.resume_id,
        "application_id": new_application.application_id
    }