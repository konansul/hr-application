import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.api.helpers.ownership import get_current_user
from backend.app.api.models import ProfileUpdateRequest, HRProfileUpdate
from backend.database.db import get_db
from backend.database.models import User, Person

router = APIRouter()


@router.get("/users/me/profile")
def get_profile(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()

    if not person:
        raise HTTPException(status_code=404, detail="Person profile not found")

    # Формируем profile_data из JSON поля
    if person.profile_json:
        profile_data = json.loads(person.profile_json)
    else:
        profile_data = {
            "personal_info": {
                "first_name": person.first_name or "",
                "last_name": person.last_name or "",
                "email": current_user.email or "",
                "phone": person.phone or "",
                "city": person.city or "",
                "country": person.country or "",
                "nationality": "",
                "visa_status": "UNKNOWN",
                "work_preference": "UNKNOWN",
                "open_to_remote": False,
                "open_to_relocation": False,
                "linkedin_url": "",
                "github_url": "",
                "portfolio_url": "",
                "summary": ""
            },
            "experience": [],
            "education": [],
            "skills": [],
            "languages": [],
            "certifications": [],
            "references": []
        }

    # Возвращаем profile_data ВМЕСТЕ с новыми полями приватности из базы
    return {
        "profile_data": profile_data,
        "visibility_level": person.visibility_level,
        "public_url_slug": person.public_url_slug
    }


@router.put("/users/me/profile")
def update_profile(
        request: ProfileUpdateRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()

    if not person:
        raise HTTPException(status_code=404, detail="Person profile not found")

    person.profile_json = json.dumps(request.profile_data, ensure_ascii=False)

    p_info = request.profile_data.get("personal_info", {})
    if p_info:
        person.first_name = p_info.get("first_name", person.first_name)
        person.last_name = p_info.get("last_name", person.last_name)
        person.phone = p_info.get("phone", person.phone)
        person.city = p_info.get("city", person.city)
        person.country = p_info.get("country", person.country)

    db.commit()
    db.refresh(person)

    return {"message": "Profile updated successfully", "profile": json.loads(person.profile_json)}


@router.get("/users/me/hr-profile")
def get_hr_profile(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Profile not found")

    existing = json.loads(person.profile_json) if person.profile_json else {}
    hr = existing.get("hr_profile", {})

    return {
        "email": current_user.email,
        "first_name": person.first_name or "",
        "last_name": person.last_name or "",
        "phone": person.phone or "",
        "city": person.city or "",
        "country": person.country or "",
        "bio": hr.get("bio", ""),
        "linkedin_url": hr.get("linkedin_url", ""),
        "company_name": hr.get("company_name", ""),
        "department": hr.get("department", ""),
        "hr_role_title": hr.get("hr_role_title", ""),
        "timezone": hr.get("timezone", ""),
    }


@router.put("/users/me/hr-profile")
def update_hr_profile(
        request: HRProfileUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Profile not found")

    if request.first_name:
        person.first_name = request.first_name
    if request.last_name:
        person.last_name = request.last_name
    person.phone = request.phone
    person.city = request.city
    person.country = request.country

    existing = json.loads(person.profile_json) if person.profile_json else {}
    existing["hr_profile"] = {
        "bio": request.bio,
        "linkedin_url": request.linkedin_url,
        "company_name": request.company_name,
        "department": request.department,
        "hr_role_title": request.hr_role_title,
        "timezone": request.timezone,
    }
    person.profile_json = json.dumps(existing, ensure_ascii=False)

    db.commit()
    return {"message": "HR profile updated successfully"}

@router.get("/hr/candidates")
def list_candidates_for_hr(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Access denied. Only HR can view candidates.")

    # ВАЖНО: Фильтруем кандидатов. Показываем только тех, у кого статус 'public'
    candidates_users = (
        db.query(User)
        .join(Person, User.user_id == Person.user_id)
        .filter(User.role == "candidate")
        .filter(Person.visibility_level == "public")
        .all()
    )

    results = []
    for u in candidates_users:
        person = u.person_profile
        if not person:
            continue

        profile_data = {}
        if person.profile_json:
            try:
                profile_data = json.loads(person.profile_json)
            except:
                pass

        p_info = profile_data.get("personal_info", {})
        skills = profile_data.get("skills", [])
        top_skills = [s.get("name") for s in skills[:3]] if skills else []

        results.append({
            "user_id": u.user_id,
            "person_id": person.person_id,
            "first_name": p_info.get("first_name", person.first_name),
            "last_name": p_info.get("last_name", person.last_name),
            "email": p_info.get("email", u.email),
            "city": p_info.get("city", person.city),
            "country": p_info.get("country", person.country),
            "top_skills": top_skills,
            "work_preference": p_info.get("work_preference", "UNKNOWN")
        })

    return results


@router.get("/hr/candidates/{person_id}/profile")
def get_candidate_profile_for_hr(
        person_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Access denied. Only HR can view profiles.")

    person = db.query(Person).filter(Person.person_id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Candidate not found")

    profile_data = {}
    if person.profile_json:
        try:
            profile_data = json.loads(person.profile_json)
        except:
            pass

    return {"profile_data": profile_data}

@router.patch("/me/privacy")
def update_privacy(
        privacy_data: dict,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Profile not found")

    if "visibility_level" in privacy_data:
        person.visibility_level = privacy_data["visibility_level"]

    if "public_url_slug" in privacy_data:
        person.public_url_slug = privacy_data["public_url_slug"]

    db.commit()
    return {
        "status": "success",
        "visibility_level": person.visibility_level,
        "public_url_slug": person.public_url_slug
    }