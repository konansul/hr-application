import json
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
import httpx

from html.parser import HTMLParser

from backend.app.api.helpers.ownership import get_current_user
from backend.app.api.models import ProfileUpdateRequest, HRProfileUpdate, UrlImportRequest
from backend.app.schemas import PublicProfileOut
from backend.database.db import get_db
from backend.database.models import User, Person, Job, Application
from backend.app.gemini import client as _llm_client
from backend.app.core.config import settings
from backend.app.services.llm.schemas import CV_PARSING_SCHEMA

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
    # Проверяем, что это HR и у него есть привязка к организации
    if current_user.role != "hr" or not current_user.org_id:
        raise HTTPException(status_code=403, detail="Access denied. Only HR with an organization can view candidates.")

    hr_org_id = current_user.org_id

    candidates_users = (
        db.query(User)
        .join(Person, User.user_id == Person.user_id)
        .outerjoin(Application, Application.person_id == Person.person_id)
        .outerjoin(Job, Job.job_id == Application.job_id)
        .filter(User.role == "candidate")
        .filter(
            or_(
                Job.org_id == hr_org_id,
                Person.shared_with_org_ids_json.contains(hr_org_id)
            )
        )
        .distinct()
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
    if current_user.role != "hr" or not current_user.org_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    hr_org_id = current_user.org_id

    person = (
        db.query(Person)
        .outerjoin(Application, Application.person_id == Person.person_id)
        .outerjoin(Job, Job.job_id == Application.job_id)
        .filter(Person.person_id == person_id)
        .filter(
            or_(
                Job.org_id == hr_org_id,
                Person.shared_with_org_ids_json.contains(hr_org_id)
            )
        )
        .first()
    )

    if not person:
        raise HTTPException(status_code=404, detail="Candidate not found or access denied")

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




class _TextExtractor(HTMLParser):
    """Strips HTML tags, skips script/style/noscript blocks, returns plain text."""
    # Only tags that have closing tags AND contain non-visible text
    # meta/link are void elements (self-closing) — never put them here or depth breaks
    _SKIP = {'script', 'style', 'noscript'}

    def __init__(self):
        super().__init__()
        self._parts: list[str] = []
        self._depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in self._SKIP:
            self._depth += 1

    def handle_endtag(self, tag):
        if tag in self._SKIP and self._depth:
            self._depth -= 1

    def handle_data(self, data):
        if not self._depth:
            t = data.strip()
            if t:
                self._parts.append(t)

    def text(self) -> str:
        return '\n'.join(self._parts)


def _html_to_text(html: str) -> str:
    p = _TextExtractor()
    p.feed(html)
    return p.text()


def _fmt_date(d) -> str:
    """Handle both dict {year,month,day} and plain string dates."""
    if not d:
        return ""
    if isinstance(d, str):
        return d
    if isinstance(d, dict):
        year = d.get("year", "")
        if not year:
            return ""
        month = str(d.get("month", 1)).zfill(2)
        day = str(d.get("day", 1)).zfill(2)
        return f"{year}-{month}-{day}"
    return ""


def _map_linkedin_to_profile(data: dict, source_url: str, existing_email: str = "") -> dict:
    # experiences — try both "experiences" key variants
    experiences = []
    for exp in (data.get("experiences") or data.get("experience") or []):
        if not isinstance(exp, dict):
            continue
        end = exp.get("ends_at") or exp.get("end_date") or exp.get("end")
        experiences.append({
            "title": exp.get("title") or exp.get("job_title") or "",
            "company": exp.get("company") or exp.get("company_name") or "",
            "start_date": _fmt_date(exp.get("starts_at") or exp.get("start_date") or exp.get("start")),
            "end_date": _fmt_date(end),
            "is_current": not end,
            "description": exp.get("description") or "",
        })

    # education — try "educations" and "education"
    education = []
    for edu in (data.get("educations") or data.get("education") or []):
        if not isinstance(edu, dict):
            continue
        education.append({
            "institution": edu.get("school") or edu.get("institution") or edu.get("school_name") or "",
            "degree": edu.get("degree_name") or edu.get("degree") or "",
            "field_of_study": edu.get("field_of_study") or edu.get("field") or "",
            "start_date": _fmt_date(edu.get("starts_at") or edu.get("start_date") or edu.get("start")),
            "end_date": _fmt_date(edu.get("ends_at") or edu.get("end_date") or edu.get("end")),
            "description": edu.get("description") or "",
        })

    # skills — list of strings or dicts
    skills = []
    for s in (data.get("skills") or []):
        if isinstance(s, str) and s:
            skills.append({"name": s, "level": ""})
        elif isinstance(s, dict):
            name = s.get("name") or s.get("skill") or ""
            if name:
                skills.append({"name": name, "level": s.get("endorsement_count", "")})

    # languages
    languages = []
    for l in (data.get("languages") or []):
        if isinstance(l, str):
            languages.append({"language": l, "proficiency": ""})
        elif isinstance(l, dict):
            name = l.get("name") or l.get("language") or ""
            if name:
                languages.append({"language": name, "proficiency": l.get("proficiency", "")})

    # certifications
    certifications = []
    for c in (data.get("certifications") or []):
        if not isinstance(c, dict):
            continue
        certifications.append({
            "name": c.get("name") or c.get("title") or "",
            "issuer": c.get("authority") or c.get("issuer") or c.get("company") or "",
            "date": _fmt_date(c.get("starts_at") or c.get("date") or c.get("issued_date")),
        })

    # location fields — different APIs use different names
    city = data.get("city") or data.get("location_city") or ""
    country = (data.get("country_full_name") or data.get("country")
               or data.get("location_country") or "")
    # summary / about
    summary = data.get("summary") or data.get("about") or data.get("bio") or ""

    return {
        "personal_info": {
            "first_name": data.get("first_name") or "",
            "last_name": data.get("last_name") or "",
            "email": existing_email,
            "phone": data.get("phone") or "",
            "city": city,
            "country": country,
            "nationality": "",
            "visa_status": "UNKNOWN",
            "work_preference": "UNKNOWN",
            "open_to_remote": False,
            "open_to_relocation": False,
            "linkedin_url": linkedin_url,
            "github_url": "",
            "portfolio_url": "",
            "summary": summary,
        },
        "experience": experiences,
        "education": education,
        "skills": skills,
        "languages": languages,
        "certifications": certifications,
        "references": [],
    }


@router.post("/users/me/import-from-url")
def import_from_url(
        request: UrlImportRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    # Fetch the page — try with SSL verification first, fall back without
    _HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }
    resp = None
    fetch_error = None
    for verify in (True, False):
        try:
            with httpx.Client(timeout=20.0, follow_redirects=True, verify=verify) as client:
                resp = client.get(url, headers=_HEADERS)
            break
        except httpx.RequestError as e:
            fetch_error = str(e)

    if resp is None:
        raise HTTPException(status_code=502, detail=f"Could not reach URL: {fetch_error}")

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"URL returned status {resp.status_code}")

    # Strip HTML → plain text, cap at 8000 chars to stay within token limits
    text = _html_to_text(resp.text)[:8000]
    if len(text.strip()) < 50:
        raise HTTPException(
            status_code=422,
            detail="This page has no readable text — it may be a JavaScript app that loads content dynamically. Try a plain HTML resume site or paste your CV as a file instead."
        )

    # Extract profile data with LLM — use json_object mode to guarantee valid JSON
    system_prompt = (
        "You are a resume and profile data extractor. "
        "Extract all available profile information from the provided webpage text. "
        "You must respond ONLY with a valid JSON object following the schema exactly. "
        f"Schema:\n{json.dumps(CV_PARSING_SCHEMA)}"
    )
    user_prompt = (
        f"Source URL: {url}\n\n"
        f"Webpage text:\n{text}\n\n"
        "Extract every available detail: personal info, work experience, education, "
        "skills, languages, and certifications. Leave fields as empty strings or empty "
        "arrays when information is not present."
    )
    try:
        response = _llm_client.chat.completions.create(
            model=settings.GEMINI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.1,
            max_tokens=4096,
            response_format={"type": "json_object"},
        )
        profile_data = json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI extraction failed: {e}")

    # Preserve existing email
    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person profile not found")

    existing = json.loads(person.profile_json) if person.profile_json else {}
    existing_email = existing.get("personal_info", {}).get("email", "") or current_user.email or ""
    if not profile_data.get("personal_info", {}).get("email"):
        profile_data.setdefault("personal_info", {})["email"] = existing_email

    # Store source URL in profile
    profile_data.setdefault("personal_info", {})["portfolio_url"] = url
    profile_data.setdefault("references", [])

    person.profile_json = json.dumps(profile_data, ensure_ascii=False)
    p = profile_data.get("personal_info", {})
    person.first_name = p.get("first_name") or person.first_name
    person.last_name  = p.get("last_name")  or person.last_name
    person.city       = p.get("city")       or person.city
    person.country    = p.get("country")    or person.country

    db.commit()

    return {"message": "Profile imported successfully", "profile_data": profile_data}


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