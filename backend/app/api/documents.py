from __future__ import annotations

import json
import hashlib
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.api.helpers.extract import extract_cv_text
from backend.app.api.models import DocumentResponse
from backend.database.storage import new_id
from backend.database.db import get_db
from backend.database.models import Document, User, Person, Resume, Job, Application
from backend.app.api.helpers.ownership import get_current_user

from backend.app.api.helpers.quota import consume_ai_quota

from backend.app.pipeline import run_cv_parsing

router = APIRouter()

STORAGE_DIR = Path(__file__).parent.parent.parent.parent / "storage" / "resumes"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

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

    try:
        cv_text, doc_content_type = extract_cv_text(file.filename or "", content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    consume_ai_quota(db, current_user)

    try:
        parsed_data = run_cv_parsing(cv_text)
    except Exception as e:
        if current_user.ai_used > 0:
            current_user.ai_used -= 1
            db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"AI parsing failed due to connection or API error: {str(e)}"
        )

    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
    if not person:
        personal_info = parsed_data.get("personal_info", {})
        person = Person(
            person_id=new_id("prs"),
            user_id=current_user.user_id,
            first_name=personal_info.get("first_name", "Unknown"),
            last_name=personal_info.get("last_name", "Unknown"),
        )
        db.add(person)
        db.flush()

    doc_id = new_id("doc")

    suffix = Path(file.filename or "file").suffix.lower()
    saved_file_path: str | None = None
    if suffix == ".pdf":
        file_on_disk = STORAGE_DIR / f"{doc_id}{suffix}"
        file_on_disk.write_bytes(content)
        saved_file_path = str(file_on_disk)

    doc = Document(
        document_id=doc_id,
        owner_user_id=current_user.user_id,
        filename=file.filename,
        content_type=doc_content_type,
        file_hash=file_hash,
        file_path=saved_file_path,
        raw_text=cv_text,
        source_type="uploaded_cv",
        document_role="source_cv"
    )
    db.add(doc)
    db.flush()

    profile_snapshot = person.profile_json
    resume = Resume(
        resume_id=new_id("res"),
        person_id=person.person_id,
        language=parsed_data.get("language") or parsed_data.get("personal_info", {}).get("language") or "en",
        title=file.filename,
        payload=json.dumps(parsed_data, ensure_ascii=False),
        source_type="cv_upload",
        source_document_id=doc.document_id,
        generated_document_id=doc.document_id if saved_file_path else None,
        profile_snapshot_json=profile_snapshot,
        generation_status="generated" if saved_file_path else "ready"
    )
    db.add(resume)
    db.flush()
    doc.resume_id = resume.resume_id

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
        job_id: Optional[str] = None,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role != "hr" or not current_user.org_id:
        raise HTTPException(status_code=403, detail="Only HR with organization can view documents")

    hr_org_id = current_user.org_id

    query = (
        db.query(Application, Resume, Document, Person)
        .join(Job, Job.job_id == Application.job_id)
        .join(Resume, Resume.resume_id == Application.resume_id)
        .join(Person, Person.person_id == Application.person_id)
        # Присоединяем документ (может быть как оригинал, так и сгенерированный)
        .outerjoin(Document, Document.document_id == Resume.generated_document_id)
        .filter(Job.org_id == hr_org_id)
    )

    if job_id:
        query = query.filter(Application.job_id == job_id)

    results = query.all()

    final_list = []
    for app, resume, doc, person in results:

        doc_id = doc.document_id if doc else resume.resume_id
        filename = doc.filename if doc else (resume.title or f"Resume_{person.last_name}.pdf")

        final_list.append({
            "document_id": doc_id,
            "owner_user_id": person.user_id,
            "filename": filename,
            "content_type": doc.content_type if doc else "application/pdf",
            "source_type": resume.source_type,
            "raw_text": doc.raw_text if doc else resume.payload,
            "candidate_name": f"{person.first_name} {person.last_name}",
            "resume_id": resume.resume_id,
            "document_role": "application_cv"
        })

    return final_list

@router.get("/documents/me")
def get_my_documents(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
    if not person:
        return []

    resumes = (
        db.query(Resume)
        .filter(Resume.person_id == person.person_id)
        .order_by(Resume.created_at.desc())
        .all()
    )

    results = []
    for r in resumes:
        doc_id = r.generated_document_id or r.source_document_id or r.resume_id

        results.append({
            "document_id": doc_id,
            "resume_id": r.resume_id,
            "owner_user_id": current_user.user_id,
            "filename": r.title or "My Resume",
            "content_type": "application/pdf",
            "source_type": r.source_type,
            "document_role": "resume"
        })

    return results


@router.get("/documents/{document_id}/file")
def get_document_file(
        document_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if current_user.role == "candidate" and doc.owner_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if not doc.file_path or not Path(doc.file_path).exists():
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        path=doc.file_path,
        media_type=doc.content_type or "application/pdf",
        filename=doc.filename,
    )


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(
        document_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if current_user.role == "candidate" and doc.owner_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(doc)
    db.commit()