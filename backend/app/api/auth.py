from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.api.models import RegisterRequest, LoginRequest, TokenResponse, UserMeResponse
from backend.database.storage import new_id
from backend.database.db import get_db
from backend.database.models import User, Organization
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
    db.commit()
    db.refresh(user)

    return {
        "user_id": user.user_id,
        "email": user.email,
        "role": user.role,
        "org_id": user.org_id
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
def me(current: User = Depends(get_current_user)):
    return {
        "user_id": current.user_id,
        "email": current.email,
        "role": current.role,
        "org_id": current.org_id
    }


@router.post("/auth/logout")
def logout():
    return {"ok": True}