import logging
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.app.api.helpers.ownership import get_current_user
from backend.app.core.config import settings
from backend.database.db import get_db
from backend.database.models import Resume, ResumeShare, User
from backend.database.storage import new_id

logger = logging.getLogger(__name__)
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


class ShareEmailRequest(BaseModel):
    recipient_email: EmailStr
    recipient_name: str = ""
    message: str = ""
    attachment_base64: str = ""
    attachment_filename: str = ""
    base_url: str = ""


@router.post("/resumes/{resume_id}/shares/send-email")
def send_share_email(
    resume_id: str,
    body: ShareEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.POSTMARK_API_KEY:
        raise HTTPException(status_code=503, detail="Email service not configured")

    resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    person = resume.person
    if not person or person.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your resume")

    # Reuse an existing share token for this recipient, or create a new one
    email_lower = str(body.recipient_email).lower().strip()
    existing = db.query(ResumeShare).filter(
        ResumeShare.resume_id == resume_id,
        ResumeShare.recipient_email == email_lower,
    ).first()
    if existing:
        share = existing
    else:
        share = ResumeShare(
            share_id=new_id("shr"),
            resume_id=resume_id,
            shared_by_user_id=current_user.user_id,
            recipient_email=email_lower,
            recipient_name=body.recipient_name.strip() or None,
            access_token=secrets.token_urlsafe(32),
            created_at=datetime.now(timezone.utc),
        )
        db.add(share)
        db.commit()
        db.refresh(share)

    sender_name = (
        f"{person.first_name} {person.last_name}".strip()
        if person and person.first_name
        else current_user.email
    )
    frontend_base = body.base_url.rstrip("/") if body.base_url else settings.FRONTEND_URL.rstrip("/")
    share_url = f"{frontend_base}/p/cv/{share.access_token}"
    greeting = f"Dear {body.recipient_name.strip()}," if body.recipient_name.strip() else "Dear Hiring Manager,"
    message_html = body.message.replace("\n", "<br>") if body.message else ""

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f5;margin:0;padding:40px 20px;">
  <div style="background:#fff;border-radius:12px;padding:40px;max-width:520px;margin:0 auto;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    {f'<div style="color:#374151;margin:0 0 24px;line-height:1.6;">{message_html}</div>' if message_html else f'<p style="color:#374151;margin:0 0 16px;">{greeting}</p>'}
    <a href="{share_url}" style="display:inline-block;padding:12px 28px;background:#7A60F4;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:0 0 24px;">View Resume</a>
    <p style="color:#9ca3af;font-size:12px;margin:16px 0 0;border-top:1px solid #f3f4f6;padding-top:16px;">
      Shared by {sender_name} via HRAI &middot;
      This link gives you personal access to their resume.
    </p>
  </div>
</body>
</html>"""

    try:
        from postmarker.core import PostmarkClient
        client = PostmarkClient(server_token=settings.POSTMARK_API_KEY)
        attachments = []
        if body.attachment_base64 and body.attachment_filename:
            attachments = [{
                "Name": body.attachment_filename,
                "Content": body.attachment_base64,
                "ContentType": "application/pdf",
            }]
        client.emails.send(
            From=settings.EMAIL_FROM,
            To=share.recipient_email,
            Subject=f"Resume from {sender_name}",
            HtmlBody=html,
            Attachments=attachments,
        )
    except Exception as exc:
        logger.error("Share email failed: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to send email")

    return {
        "share_id": share.share_id,
        "recipient_email": share.recipient_email,
        "access_token": share.access_token,
    }
