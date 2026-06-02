import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.api.helpers.ownership import get_current_user
from backend.database.db import get_db
from backend.database.models import Resume, ResumeShare, User
from backend.database.storage import new_id

router = APIRouter()


class CreateShareRequest(BaseModel):
    recipient_email: str
    recipient_name: str = ""


@router.post("/resumes/{resume_id}/shares")
def create_share(
    resume_id: str,
    body: CreateShareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    person = resume.person
    if not person or person.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your resume")

    # Prevent duplicate shares for the same email
    existing = db.query(ResumeShare).filter(
        ResumeShare.resume_id == resume_id,
        ResumeShare.recipient_email == body.recipient_email.lower().strip(),
    ).first()
    if existing:
        return {
            "share_id": existing.share_id,
            "recipient_email": existing.recipient_email,
            "recipient_name": existing.recipient_name,
            "access_token": existing.access_token,
            "created_at": existing.created_at.isoformat(),
        }

    share = ResumeShare(
        share_id=new_id("shr"),
        resume_id=resume_id,
        shared_by_user_id=current_user.user_id,
        recipient_email=body.recipient_email.lower().strip(),
        recipient_name=body.recipient_name.strip() or None,
        access_token=secrets.token_urlsafe(32),
        created_at=datetime.now(timezone.utc),
    )
    db.add(share)
    db.commit()
    db.refresh(share)

    return {
        "share_id": share.share_id,
        "recipient_email": share.recipient_email,
        "recipient_name": share.recipient_name,
        "access_token": share.access_token,
        "created_at": share.created_at.isoformat(),
    }


@router.get("/resumes/{resume_id}/shares")
def list_shares(
    resume_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    person = resume.person
    if not person or person.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your resume")

    shares = db.query(ResumeShare).filter(ResumeShare.resume_id == resume_id).all()
    return [
        {
            "share_id": s.share_id,
            "recipient_email": s.recipient_email,
            "recipient_name": s.recipient_name,
            "access_token": s.access_token,
            "created_at": s.created_at.isoformat(),
        }
        for s in shares
    ]


@router.delete("/resumes/{resume_id}/shares/{share_id}", status_code=204)
def delete_share(
    resume_id: str,
    share_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    share = db.query(ResumeShare).filter(
        ResumeShare.share_id == share_id,
        ResumeShare.resume_id == resume_id,
    ).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    resume = share.resume
    if not resume or not resume.person or resume.person.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your resume")

    db.delete(share)
    db.commit()
