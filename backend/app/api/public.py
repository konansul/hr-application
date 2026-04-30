import json

from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session

from backend.app.schemas import PublicProfileOut
from backend.database.db import get_db
from backend.database.models import Person

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