import json

from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session

from backend.app.api.jobs import DEFAULT_PIPELINE_STAGES
from backend.app.api.resumes import resume_payload
from backend.app.schemas import PublicProfileOut, JobOut
from backend.database.db import get_db
from backend.database.models import Person, Job, Resume, ResumeShare

router = APIRouter()

@router.get("/public/p/{slug}", response_model=PublicProfileOut)
def get_public_profile(slug: str, db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.public_url_slug == slug).first()

    if not person:
        raise HTTPException(status_code=404, detail="Profile not found")

    if person.visibility_level == "private":
        raise HTTPException(status_code=403, detail="This profile is private")

    profile_data = {}
    if person.profile_json:
        try:
            profile_data = json.loads(person.profile_json)
        except json.JSONDecodeError:
            pass

    return {
        "person_id": person.person_id,
        "first_name": person.first_name,
        "last_name": person.last_name,
        "profile_data": profile_data
    }

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

@router.get("/resumes/public/{token}")
def get_public_resume(token: str, db: Session = Depends(get_db)):
    # 1. Try as a per-recipient share token (no public_sharing_enabled check needed)
    # Wrapped in try/except in case the migration hasn't run yet on older deployments
    try:
        share = db.query(ResumeShare).filter(ResumeShare.access_token == token).first()
        if share:
            resume = share.resume
            if not resume:
                raise HTTPException(status_code=404, detail="Resume not found")
            return {
                "title": resume.title,
                "language": resume.language,
                "resume_data": resume_payload(resume),
            }
    except HTTPException:
        raise
    except Exception:
        pass  # Table may not exist yet — fall through to resume_id lookup

    # 2. Try as a resume_id (existing public link)
    resume = db.query(Resume).filter(Resume.resume_id == token).first()
    if not resume:
        person = db.query(Person).filter(Person.public_url_slug == token).first()
        if person:
            resume = (
                db.query(Resume)
                .filter(Resume.person_id == person.person_id)
                .order_by(Resume.created_at.desc())
                .first()
            )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if not resume.public_sharing_enabled:
        raise HTTPException(status_code=403, detail="This resume is not publicly shared")
    return {
        "title": resume.title,
        "language": resume.language,
        "resume_data": resume_payload(resume),
    }