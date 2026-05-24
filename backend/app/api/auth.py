from __future__ import annotations

import secrets
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.schemas import RegisterRequest, LoginRequest, TokenResponse, UserMeResponse
from backend.database.storage import new_id
from backend.database.db import get_db
from backend.database.models import User, Organization, Person
from backend.database.security import hash_password, verify_password, create_access_token
from backend.app.api.helpers.ownership import get_current_user
router = APIRouter()

@router.post("/auth/register", response_model=UserMeResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    org_name = req.organization_name.strip() if hasattr(req, "organization_name") and req.organization_name else None

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")

    if not req.password or len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    exists = db.query(User).filter(User.email == email).first()
    if exists:
        raise HTTPException(status_code=409, detail="Email already registered")

    final_org_id = None

    if req.role == "hr":
        if not org_name:
            raise HTTPException(status_code=400, detail="Organization name is required for HR")

        org = db.query(Organization).filter(Organization.name == org_name).first()
        if not org:
            org = Organization(
                org_id=new_id("org"),
                name=org_name
            )
            db.add(org)
            db.flush()
        final_org_id = org.org_id

    user = User(
        user_id=new_id("usr"),
        email=email,
        org_id=final_org_id,
        password_hash=hash_password(req.password),
        role=req.role,
        is_active=True,
    )
    db.add(user)
    db.flush()

    person = Person(
        person_id=new_id("prs"),
        user_id=user.user_id,
        first_name=getattr(req, "first_name", "User"),
        last_name=getattr(req, "last_name", "")
    )
    db.add(person)

    db.commit()
    db.refresh(user)
    db.refresh(person)

    return {
        "user_id": user.user_id,
        "email": user.email,
        "role": user.role,
        "org_id": user.org_id,
        "first_name": person.first_name,
        "last_name": person.last_name
    }


@router.post("/auth/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()

    user: Optional[User] = db.query(User).filter(User.email == email).first()
    if not user or not getattr(user, "is_active", True):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(subject=user.user_id)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/auth/me", response_model=UserMeResponse)
def me(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.user_id == current.user_id).first()

    today = date.today()
    actual_ai_used = current.ai_used if current.last_quota_reset == today else 0

    return {
        "user_id": current.user_id,
        "email": current.email,
        "role": current.role,
        "org_id": current.org_id,
        "person_id": person.person_id if person else None,
        "first_name": person.first_name if person else None,
        "last_name": person.last_name if person else None,

        "ai_quota": current.ai_quota,
        "ai_used": actual_ai_used
    }

@router.post("/auth/logout")
def logout():
    return {"ok": True}


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    user: Optional[User] = db.query(User).filter(User.email == email).first()

    # Always return 200 to avoid email enumeration
    if not user or not user.is_active:
        return {"ok": True}

    token = secrets.token_urlsafe(32)
    user.password_reset_token = token
    user.password_reset_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()

    if settings.POSTMARK_API_KEY:
        try:
            from postmarker.core import PostmarkClient
            reset_url = f"{settings.FRONTEND_URL}?reset_token={token}"
            html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f5;margin:0;padding:40px 20px;">
  <div style="background:#fff;border-radius:12px;padding:40px;max-width:480px;margin:0 auto;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <h2 style="color:#111827;margin:0 0 8px;">Reset your password</h2>
    <p style="color:#6b7280;margin:0 0 24px;">Click the button below to reset your password. This link expires in 1 hour.</p>
    <a href="{reset_url}" style="display:inline-block;padding:12px 28px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Reset Password</a>
    <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;">If you did not request a password reset, ignore this email.</p>
  </div>
</body>
</html>"""
            client = PostmarkClient(server_token=settings.POSTMARK_API_KEY)
            client.emails.send(
                From=settings.EMAIL_FROM,
                To=user.email,
                Subject="Reset your HRAI password",
                HtmlBody=html,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Password reset email failed: %s", e)

    return {"ok": True}


@router.post("/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    if not req.token or not req.new_password:
        raise HTTPException(status_code=400, detail="Token and new password are required")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user: Optional[User] = db.query(User).filter(User.password_reset_token == req.token).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    if not user.password_reset_token_expires_at:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    if datetime.now(timezone.utc) > user.password_reset_token_expires_at:
        raise HTTPException(status_code=400, detail="Reset link has expired")

    user.password_hash = hash_password(req.new_password)
    user.password_reset_token = None
    user.password_reset_token_expires_at = None
    db.commit()

    return {"ok": True}


@router.get("/auth/reactivate")
def reactivate_account(token: str = Query(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reactivation_token == token).first()

    if not user:
        raise HTTPException(status_code=404, detail="Invalid or expired reactivation link")

    user.inactivity_warning_sent_at = None
    user.reactivation_token = None
    user.last_active_at = datetime.now(timezone.utc)
    db.commit()

    if settings.FRONTEND_URL:
        return RedirectResponse(url=f"{settings.FRONTEND_URL}?reactivated=1", status_code=302)

    return HTMLResponse(
        content="""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Account Reactivated</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
       display:flex;align-items:center;justify-content:center;min-height:100vh;
       background:#f4f4f5;margin:0;}
  .card{background:#fff;border-radius:12px;padding:48px 40px;text-align:center;
        box-shadow:0 2px 12px rgba(0,0,0,.1);max-width:400px;}
  h1{color:#16a34a;font-size:24px;margin:0 0 12px;}
  p{color:#6b7280;margin:0 0 24px;}
  a{display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#0ea5e9,#3b82f6);
    color:#fff;text-decoration:none;border-radius:8px;font-weight:600;}
</style>
</head>
<body>
  <div class="card">
    <h1>&#10003; Account reactivated</h1>
    <p>Your account is active again. You can now log in as usual.</p>
    <a href="/">Go to login</a>
  </div>
</body>
</html>""",
        status_code=200,
    )