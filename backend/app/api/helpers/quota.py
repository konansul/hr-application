from datetime import date
from fastapi import HTTPException
from sqlalchemy.orm import Session
from backend.database.models import User


def consume_ai_quota(db: Session, user: User):
    today = date.today()

    if user.last_quota_reset != today:
        user.ai_used = 0
        user.last_quota_reset = today

    if user.ai_used >= user.ai_quota:
        raise HTTPException(
            status_code=429,
            detail="Daily AI limit exceeded. Please try again tomorrow."
        )

    user.ai_used += 1
    db.commit()
    db.refresh(user)

    return user