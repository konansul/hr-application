from __future__ import annotations

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.schemas import JobCreate, JobOut
from backend.app.api.models import JobRefineRequest, JobRefineResponse, JobUpdate
from backend.database.db import get_db
from backend.database.models import Job, User
from backend.database.storage import new_id
from backend.app.api.helpers.ownership import get_current_user

from backend.app.pipeline import run_job_refinement

router = APIRouter()


@router.post("/jobs/refine", response_model=JobRefineResponse)
def refine_job_description(
        request: JobRefineRequest,
        current_user: User = Depends(get_current_user),
):
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
        raise HTTPException(status_code=500, detail=f"AI Refinement failed: {str(e)}")


@router.post("/jobs", response_model=JobOut)
def create_job(
        job: JobCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    if not current_user.org_id:
        raise HTTPException(status_code=403, detail="User does not belong to an organization")

    screening_questions_str = None
    if hasattr(job, "screening_questions") and job.screening_questions:
        screening_questions_str = json.dumps(job.screening_questions, ensure_ascii=False)

    db_job = Job(
        job_id=new_id("job"),
        org_id=current_user.org_id,
        owner_user_id=current_user.user_id,
        title=job.title,
        description=job.description,
        region=getattr(job, "region", None),
        screening_questions_json=screening_questions_str
    )

    db.add(db_job)
    db.commit()
    db.refresh(db_job)

    return JobOut(
        id=db_job.job_id,
        title=db_job.title,
        description=db_job.description,
        region=db_job.region,
        screening_questions=json.loads(db_job.screening_questions_json) if db_job.screening_questions_json else []
    )


@router.get("/jobs", response_model=list[JobOut])
def list_jobs(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    # Если зашел HR — фильтруем по его организации
    if current_user.role == "hr":
        if not current_user.org_id:
            return []
        jobs = (
            db.query(Job)
            .filter(Job.org_id == current_user.org_id)
            .order_by(Job.created_at.desc())
            .all()
        )
    else:
        jobs = db.query(Job).order_by(Job.created_at.desc()).all()

    return [
        JobOut(
            id=job.job_id,
            title=job.title,
            description=job.description,
            region=job.region,
            screening_questions=json.loads(job.screening_questions_json) if job.screening_questions_json else []
        )
        for job in jobs
    ]


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(
        job_id: str,
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

    return JobOut(
        id=job.job_id,
        title=job.title,
        description=job.description,
        region=job.region,
        screening_questions=json.loads(job.screening_questions_json) if job.screening_questions_json else []
    )


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

    job.title = job_update.title
    job.description = job_update.description

    if hasattr(job_update, "region"):
        job.region = job_update.region

    if hasattr(job_update, "screening_questions"):
        job.screening_questions_json = json.dumps(job_update.screening_questions,
                                                  ensure_ascii=False) if job_update.screening_questions else None

    db.commit()
    db.refresh(job)

    return JobOut(
        id=job.job_id,
        title=job.title,
        description=job.description,
        region=job.region,
        screening_questions=json.loads(job.screening_questions_json) if job.screening_questions_json else []
    )