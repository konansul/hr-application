from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.database.models import UserFeedback
from backend.database.storage import new_id
from backend.app.api.helpers.ownership import get_current_user

router = APIRouter()


class FeedbackRequest(BaseModel):
    stars: int = Field(..., ge=1, le=5)
    comment: str = ""


@router.post("/feedback")
def submit_feedback(
    body: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    existing = db.query(UserFeedback).filter(UserFeedback.user_id == current_user.user_id).first()
    if existing:
        existing.stars = body.stars
        existing.comment = body.comment.strip()
        db.commit()
        db.refresh(existing)
        return {"feedback_id": existing.feedback_id, "stars": existing.stars, "comment": existing.comment or ""}

    feedback = UserFeedback(
        feedback_id=new_id("fb"),
        user_id=current_user.user_id,
        stars=body.stars,
        comment=body.comment.strip(),
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return {"feedback_id": feedback.feedback_id, "stars": feedback.stars, "comment": feedback.comment or ""}


@router.get("/feedback/mine")
def get_my_feedback(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    feedback = db.query(UserFeedback).filter(UserFeedback.user_id == current_user.user_id).first()
    if not feedback:
        return None
    return {"feedback_id": feedback.feedback_id, "stars": feedback.stars, "comment": feedback.comment or ""}


@router.get("/admin/feedback")
def get_all_feedback(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not current_user.is_teammate:
        raise HTTPException(status_code=403, detail="Forbidden")

    rows = (
        db.query(UserFeedback)
        .order_by(UserFeedback.updated_at.desc())
        .all()
    )

    entries = [
        {
            "feedback_id": r.feedback_id,
            "user_email": r.user.email,
            "user_role": r.user.role,
            "stars": r.stars,
            "comment": r.comment or "",
            "submitted_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]

    total = len(entries)
    avg_stars = round(sum(e["stars"] for e in entries) / total, 2) if total else 0
    distribution = {str(i): sum(1 for e in entries if e["stars"] == i) for i in range(1, 6)}

    return {
        "total": total,
        "avg_stars": avg_stars,
        "distribution": distribution,
        "entries": entries,
    }
