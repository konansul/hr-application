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
        improved_text = run_job_refinement(request.title, request.description)
        return JobRefineResponse(improved_description=improved_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Refinement failed: {str(e)}")

@router.post("/jobs", response_model=JobOut)
def create_job(
        job: JobCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    db_job = Job(
        job_id=new_id("job"),
        owner_user_id=current_user.user_id,
        title=job.title,
        description=job.description,
    )

    db.add(db_job)
    db.commit()
    db.refresh(db_job)

    return JobOut(
        id=db_job.job_id,
        title=db_job.title,
        description=db_job.description,
    )

@router.get("/jobs", response_model=list[JobOut])
def list_jobs(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    jobs = (
        db.query(Job)
        .join(User, Job.owner_user_id == User.user_id)
        .filter(User.org_id == current_user.org_id)
        .order_by(Job.created_at.desc())
        .all()
    )

    return [
        JobOut(
            id=job.job_id,
            title=job.title,
            description=job.description,
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
        .join(User, Job.owner_user_id == User.user_id)
        .filter(
            Job.job_id == job_id,
            User.org_id == current_user.org_id,
        )
        .first()
    )

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobOut(
        id=job.job_id,
        title=job.title,
        description=job.description,
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
        .join(User, Job.owner_user_id == User.user_id)
        .filter(
            Job.job_id == job_id,
            User.org_id == current_user.org_id,
        )
        .first()
    )

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.title = job_update.title
    job.description = job_update.description

    db.commit()
    db.refresh(job)

    return JobOut(
        id=job.job_id,
        title=job.title,
        description=job.description,
    )