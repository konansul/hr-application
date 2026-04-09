from __future__ import annotations

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.schemas import JobCreate, JobOut
from backend.app.api.models import JobRefineRequest, JobRefineResponse, JobUpdate
from backend.database.db import get_db
from backend.database.models import Job, User, Person, Resume, Application
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
    if current_user.role == "hr":
        if not current_user.org_id:
            raise HTTPException(status_code=403, detail="User does not belong to an organization")
        org_id = current_user.org_id
    else:
        # Candidates create personal tracking entries with no organization
        org_id = None

    screening_questions_str = None
    if hasattr(job, "screening_questions") and job.screening_questions:
        screening_questions_str = json.dumps(job.screening_questions, ensure_ascii=False)

    db_job = Job(
        job_id=new_id("job"),
        org_id=org_id,
        owner_user_id=current_user.user_id,
        title=job.title,
        description=job.description,
        region=getattr(job, "region", None),
        screening_questions_json=screening_questions_str
    )

    db.add(db_job)
    db.flush()

    # For candidates, auto-create an application so they can track stages
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
            status="Applied"
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
        screening_questions=qs,
        owner_user_id=db_job.owner_user_id
    )


@router.get("/jobs", response_model=list[JobOut])
def list_jobs(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
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
        # Candidates only see HR-published jobs (org_id is set); candidate-tracked jobs live in Job Applications tab
        jobs = (
            db.query(Job)
            .filter(Job.org_id.isnot(None))
            .order_by(Job.created_at.desc())
            .all()
        )

    results = []
    for job in jobs:
        qs = []
        if job.screening_questions_json:
            try:
                qs = json.loads(job.screening_questions_json)
            except:
                qs = []

        results.append(JobOut(
            id=job.job_id,
            title=job.title,
            description=job.description,
            region=job.region,
            screening_questions=qs,
            owner_user_id=job.owner_user_id
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

    return JobOut(
        id=job.job_id,
        title=job.title,
        description=job.description,
        region=job.region,
        screening_questions=qs,
        owner_user_id=job.owner_user_id
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

    job.title = job_update.title
    job.description = job_update.description

    if job_update.region is not None:
        job.region = job_update.region

    if job_update.screening_questions is not None:
        job.screening_questions_json = json.dumps(
            job_update.screening_questions,
            ensure_ascii=False
        )

    db.commit()
    db.refresh(job)

    qs = []
    if job.screening_questions_json:
        try:
            qs = json.loads(job.screening_questions_json)
        except:
            qs = []

    return JobOut(
        id=job.job_id,
        title=job.title,
        description=job.description,
        region=job.region,
        screening_questions=qs,
        owner_user_id=job.owner_user_id
    )