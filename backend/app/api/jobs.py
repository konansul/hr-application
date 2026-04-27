from __future__ import annotations

import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.schemas import JobCreate, JobOut
from backend.app.api.models import JobRefineRequest, JobRefineResponse, JobUpdate
from backend.database.db import get_db
from backend.database.models import Job, User, Person, Resume, Application
from backend.database.storage import new_id
from backend.app.api.helpers.ownership import get_current_user

# ИМПОРТИРУЕМ ФУНКЦИЮ ЛИМИТОВ
from backend.app.api.helpers.quota import consume_ai_quota
from backend.app.pipeline import run_job_refinement

router = APIRouter()

DEFAULT_PIPELINE_STAGES = ["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFER", "REJECTED"]


@router.post("/jobs/refine", response_model=JobRefineResponse)
def refine_job_description(
        request: JobRefineRequest,
        db: Session = Depends(get_db), # ДОБАВЛЕНО: сессия БД
        current_user: User = Depends(get_current_user),
):
    # ПРОВЕРЯЕМ И СПИСЫВАЕМ КВОТУ
    consume_ai_quota(db, current_user)

    try:
        region = getattr(request, "region", None)

        improved_text = run_job_refinement(
            title=request.title,
            description=request.description,
            region=region,
            include_di_clause=getattr(request, "include_di_clause", False),
            include_anti_scam=getattr(request, "include_anti_scam", False),
            include_eeo_statement=getattr(request, "include_eeo_statement", False),
            include_pay_transparency=getattr(request, "include_pay_transparency", False),
            include_gdpr_notice=getattr(request, "include_gdpr_notice", False),
            include_eu_salary_law=getattr(request, "include_eu_salary_law", False),
            include_visa_sponsorship=getattr(request, "include_visa_sponsorship", False)
        )
        return JobRefineResponse(improved_description=improved_text)
    except Exception as e:
        # ВОЗВРАЩАЕМ ПОПЫТКУ, ЕСЛИ ИИ УПАЛ С ОШИБКОЙ
        if current_user.ai_used > 0:
            current_user.ai_used -= 1
            db.commit()
        raise HTTPException(status_code=500, detail=f"AI Refinement failed: {str(e)}")


@router.post("/jobs", response_model=JobOut)
def create_job(
        job: JobCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    if current_user.role == "hr":
        if not current_user.org_id:
            raise HTTPException(status_code=403, detail="User does not belong to an organization")
        org_id = current_user.org_id
    else:
        org_id = None

    screening_questions_str = None
    if hasattr(job, "screening_questions") and job.screening_questions:
        screening_questions_str = json.dumps(job.screening_questions, ensure_ascii=False)

    stages = getattr(job, "pipeline_stages", None)
    if not stages:
        stages = DEFAULT_PIPELINE_STAGES
    pipeline_stages_str = json.dumps(stages, ensure_ascii=False)

    db_job = Job(
        job_id=new_id("job"),
        org_id=org_id,
        owner_user_id=current_user.user_id,
        title=job.title,
        description=job.description,
        region=getattr(job, "region", None),
        level=getattr(job, "level", None),
        status=getattr(job, "status", "active"),
        screening_questions_json=screening_questions_str,
        pipeline_stages_json=pipeline_stages_str,
        requirements=job.requirements.model_dump() if getattr(job, "requirements", None) else None
    )

    db.add(db_job)
    db.flush()

    if current_user.role == "candidate":
        person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
        if not person:
            raise HTTPException(status_code=400, detail="Please complete your profile first")
        resume = db.query(Resume).filter(
            Resume.person_id == person.person_id
        ).order_by(Resume.created_at.desc()).first()
        new_app = Application(
            application_id=new_id("app"),
            job_id=db_job.job_id,
            person_id=person.person_id,
            resume_id=resume.resume_id if resume else None,
            status=stages[0] if stages else "APPLIED"
        )
        db.add(new_app)

    db.commit()
    db.refresh(db_job)

    qs = []
    if db_job.screening_questions_json:
        try:
            qs = json.loads(db_job.screening_questions_json)
        except:
            qs = []

    return JobOut(
        id=db_job.job_id,
        title=db_job.title,
        description=db_job.description,
        region=db_job.region,
        level=db_job.level,
        status=db_job.status,
        screening_questions=qs,
        pipeline_stages=stages,
        owner_user_id=db_job.owner_user_id,
        requirements=db_job.requirements
    )


@router.get("/jobs", response_model=list[JobOut])
def list_jobs(
        level: Optional[str] = None,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    query = db.query(Job)

    if current_user.role == "hr":
        if not current_user.org_id:
            return []
        query = query.filter(Job.org_id == current_user.org_id)
    else:
        query = query.filter(Job.org_id.isnot(None))

    if level and level != 'All':
        query = query.filter(Job.level == level)

    jobs = query.order_by(Job.created_at.desc()).all()

    results = []
    for job in jobs:
        qs = []
        if job.screening_questions_json:
            try:
                qs = json.loads(job.screening_questions_json)
            except:
                qs = []

        stages = DEFAULT_PIPELINE_STAGES
        if job.pipeline_stages_json:
            try:
                stages = json.loads(job.pipeline_stages_json)
            except:
                pass

        results.append(JobOut(
            id=job.job_id,
            title=job.title,
            description=job.description,
            region=job.region,
            level=job.level,
            status=job.status,
            screening_questions=qs,
            pipeline_stages=stages,
            owner_user_id=job.owner_user_id,
            requirements=job.requirements
        ))
    return results


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(
        job_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    query = db.query(Job).filter(Job.job_id == job_id)
    if current_user.role == "hr":
        query = query.filter(Job.org_id == current_user.org_id)

    job = query.first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    qs = []
    if job.screening_questions_json:
        try:
            qs = json.loads(job.screening_questions_json)
        except:
            qs = []

    stages = DEFAULT_PIPELINE_STAGES
    if job.pipeline_stages_json:
        try:
            stages = json.loads(job.pipeline_stages_json)
        except:
            pass

    return JobOut(
        id=job.job_id,
        title=job.title,
        description=job.description,
        region=job.region,
        level=job.level,
        status=job.status,
        screening_questions=qs,
        pipeline_stages=stages,
        owner_user_id=job.owner_user_id,
        requirements=job.requirements
    )


@router.delete("/jobs/{job_id}", status_code=204)
def delete_job(
        job_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can delete jobs")

    job = db.query(Job).filter(
        Job.job_id == job_id,
        Job.org_id == current_user.org_id,
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    db.delete(job)
    db.commit()


@router.put("/jobs/{job_id}", response_model=JobOut)
def update_job(
        job_id: str,
        job_update: JobUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    job = (
        db.query(Job)
        .filter(
            Job.job_id == job_id,
            Job.org_id == current_user.org_id,
        )
        .first()
    )

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    update_data = job_update.model_dump(exclude_unset=True)

    if "title" in update_data:
        job.title = update_data["title"]
    if "description" in update_data:
        job.description = update_data["description"]
    if "region" in update_data:
        job.region = update_data["region"]
    if "level" in update_data:
        job.level = update_data["level"]
    if "status" in update_data:
        job.status = update_data["status"]

    if "screening_questions" in update_data and update_data["screening_questions"] is not None:
        job.screening_questions_json = json.dumps(
            update_data["screening_questions"],
            ensure_ascii=False
        )

    if "pipeline_stages" in update_data and update_data["pipeline_stages"] is not None:
        job.pipeline_stages_json = json.dumps(
            update_data["pipeline_stages"],
            ensure_ascii=False
        )

    if "requirements" in update_data and update_data["requirements"] is not None:
        job.requirements = update_data["requirements"]

    db.commit()
    db.refresh(job)

    qs = []
    if job.screening_questions_json:
        try:
            qs = json.loads(job.screening_questions_json)
        except:
            qs = []

    stages = DEFAULT_PIPELINE_STAGES
    if job.pipeline_stages_json:
        try:
            stages = json.loads(job.pipeline_stages_json)
        except:
            pass

    return JobOut(
        id=job.job_id,
        title=job.title,
        description=job.description,
        region=job.region,
        level=job.level,
        status=job.status,
        screening_questions=qs,
        pipeline_stages=stages,
        owner_user_id=job.owner_user_id,
        requirements=job.requirements
    )

@router.get("/public/jobs/{job_id}", response_model=JobOut)
def get_public_job(
        job_id: str,
        db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.job_id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "active":
        raise HTTPException(status_code=403, detail="This job is not currently accepting applications")

    qs = []
    if job.screening_questions_json:
        try:
            qs = json.loads(job.screening_questions_json)
        except:
            qs = []

    stages = DEFAULT_PIPELINE_STAGES
    if job.pipeline_stages_json:
        try:
            stages = json.loads(job.pipeline_stages_json)
        except:
            pass

    return JobOut(
        id=job.job_id,
        title=job.title,
        description=job.description,
        region=job.region,
        level=job.level,
        status=job.status,
        screening_questions=qs,
        pipeline_stages=stages,
        owner_user_id=job.owner_user_id,
        requirements=job.requirements
    )