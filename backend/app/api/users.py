import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx

from backend.app.api.helpers.ownership import get_current_user
from backend.app.api.helpers.text_extractor import _html_to_text
from backend.app.schemas import UrlImportRequest
from backend.database.db import get_db
from backend.database.models import User, Person
from backend.app.gemini import client as _llm_client
from backend.app.core.config import settings
from backend.app.services.llm.schemas import CV_PARSING_SCHEMA

router = APIRouter()

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


@router.post("/users/me/import-from-url")
def import_from_url(
        request: UrlImportRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

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

    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person profile not found")

    existing = json.loads(person.profile_json) if person.profile_json else {}
    existing_email = existing.get("personal_info", {}).get("email", "") or current_user.email or ""
    if not profile_data.get("personal_info", {}).get("email"):
        profile_data.setdefault("personal_info", {})["email"] = existing_email

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