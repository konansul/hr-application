from __future__ import annotations

import json
import hashlib
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from backend.app.api.models import DocumentResponse
from backend.database.storage import new_id
from backend.database.db import get_db
from backend.database.models import Document, User, Person, Resume
from backend.app.api.helpers.ownership import get_current_user

from backend.app.services.parsing.pdf import pdf_to_text
from backend.app.services.parsing.docx import docx_to_text
from backend.app.services.parsing.clean import clean_text
from backend.app.pipeline import run_cv_parsing

router = APIRouter()


def extract_cv_text(filename: str, data: bytes) -> tuple[str, str]:
    filename = (filename or "").lower()
    if filename.endswith(".pdf"):
        cv_text = pdf_to_text(data)
        content_type = "application/pdf"
    elif filename.endswith(".docx"):
        cv_text = docx_to_text(data)
        content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif filename.endswith(".txt"):
        cv_text = data.decode("utf-8", errors="ignore")
        content_type = "text/plain"
    else:
        raise ValueError("Supported formats: .pdf, .docx, .txt")

    cv_text = clean_text(cv_text)
    if not cv_text:
        raise ValueError("Could not extract text from file")
    return cv_text, content_type


@router.post("/documents/upload", response_model=DocumentResponse)
async def upload_document(
        file: UploadFile = File(...),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can upload CVs")

    content = await file.read()
    file_hash = hashlib.sha256(content).hexdigest()

    existing = db.query(Document).filter(
        Document.file_hash == file_hash,
        Document.owner_user_id == current_user.user_id
    ).first()

    if existing:
        raise HTTPException(status_code=409, detail="Document already uploaded")

    from backend.app.api.documents import extract_cv_text
    try:
        cv_text, doc_content_type = extract_cv_text(file.filename or "", content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        parsed_data = run_cv_parsing(cv_text)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI parsing failed due to connection or API error: {str(e)}"
        )

    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
    personal_info = parsed_data.get("personal_info", {})

    if not person:
        person = Person(
            person_id=new_id("prs"),
            user_id=current_user.user_id,
            first_name=personal_info.get("first_name", "Unknown"),
            last_name=personal_info.get("last_name", "Unknown"),
            phone=personal_info.get("phone"),
            city=personal_info.get("city"),
            country=personal_info.get("country")
        )
        db.add(person)
    else:
        if not person.phone and personal_info.get("phone"):
            person.phone = personal_info.get("phone")
        if not person.city and personal_info.get("city"):
            person.city = personal_info.get("city")

    db.flush()

    doc = Document(
        document_id=new_id("doc"),
        owner_user_id=current_user.user_id,
        filename=file.filename,
        content_type=doc_content_type,
        file_hash=file_hash,
        raw_text=cv_text,
        source_type="uploaded_cv"
    )
    db.add(doc)

    resume = Resume(
        resume_id=new_id("res"),
        person_id=person.person_id,
        payload=json.dumps(parsed_data, ensure_ascii=False)
    )
    db.add(resume)

    db.commit()
    db.refresh(doc)
    db.refresh(resume)

    return {
        "document_id": doc.document_id,
        "resume_id": resume.resume_id,
        "owner_user_id": doc.owner_user_id,
        "filename": doc.filename,
        "content_type": doc.content_type,
        "source_type": doc.source_type,
        "parsed_data": parsed_data
    }

@router.get("/documents/organization", response_model=List[DocumentResponse])
def get_organization_documents(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can view candidates")

    documents = db.query(Document).filter(
        Document.source_type.in_(["uploaded_cv", "public_application"])
    ).all()

    return [
        {
            "document_id": d.document_id,
            "owner_user_id": d.owner_user_id,
            "filename": d.filename,
            "content_type": d.content_type,
            "source_type": d.source_type,
            "raw_text": d.raw_text
        }
        for d in documents
    ]


@router.get("/documents/me", response_model=List[DocumentResponse])
def get_my_documents(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    documents = db.query(Document).filter(Document.owner_user_id == current_user.user_id).all()

    return [
        {
            "document_id": d.document_id,
            "owner_user_id": d.owner_user_id,
            "filename": d.filename,
            "content_type": d.content_type,
            "source_type": d.source_type
        }
        for d in documents
    ]


@router.post("/applications/submit")
async def submit_public_application(
        name: str = Form(...),
        email: str = Form(...),
        phone: str = Form(None),
        position: str = Form(...),
        salary_expectation: str = Form(...),
        education: str = Form(...),
        skills: str = Form(...),
        experience_years: str = Form(...),
        motivation: str = Form(...),
        job_id: str = Form(...),
        file: UploadFile = File(...),
        db: Session = Depends(get_db)
):
    content = await file.read()
    try:
        cv_text, doc_content_type = extract_cv_text(file.filename or "", content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            user_id=new_id("usr"),
            email=email,
            password_hash="no_login_public_user",
            role="candidate"
        )
        db.add(user)
        db.flush()

    enriched_raw_text = f"""
CANDIDATE APPLICATION FORM

Job ID Applied For: {job_id}
Name: {name}
Email: {email}
Phone: {phone or 'Not provided'}
Target Position: {position}
Salary Expectation: {salary_expectation}
Education: {education}
Years of Experience: {experience_years}
Self-Reported Skills: {skills}
Motivation: {motivation}

ORIGINAL CV TEXT
{cv_text}
"""

    try:
        parsed_data = run_cv_parsing(enriched_raw_text)
    except Exception:
        parsed_data = {}

    person = db.query(Person).filter(Person.user_id == user.user_id).first()
    personal_info = parsed_data.get("personal_info", {})

    if not person:
        name_parts = name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else "Unknown"

        person = Person(
            person_id=new_id("prs"),
            user_id=user.user_id,
            first_name=personal_info.get("first_name") or first_name,
            last_name=personal_info.get("last_name") or last_name,
            phone=phone or personal_info.get("phone")
        )
        db.add(person)
    db.flush()

    file_hash = hashlib.sha256(content).hexdigest()

    doc = Document(
        document_id=new_id("doc"),
        owner_user_id=user.user_id,
        filename=file.filename,
        content_type=doc_content_type,
        file_hash=file_hash,
        raw_text=enriched_raw_text,
        source_type="public_application"
    )
    db.add(doc)

    resume = Resume(
        resume_id=new_id("res"),
        person_id=person.person_id,
        payload=json.dumps(parsed_data, ensure_ascii=False)
    )
    db.add(resume)

    db.commit()

    return {
        "status": "success",
        "message": "Application saved to database successfully",
        "document_id": doc.document_id,
        "resume_id": resume.resume_id
    }

@router.get("/resumes/latest")
def get_latest_resume(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Profile not found")

    resume = db.query(Resume).filter(Resume.person_id == person.person_id).order_by(Resume.created_at.desc()).first()
    if not resume:
        return None

    return json.loads(resume.payload)