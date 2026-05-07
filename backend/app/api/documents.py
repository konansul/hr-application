from __future__ import annotations

import json
import hashlib
import os
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from azure.storage.blob import BlobServiceClient, ContentSettings
from starlette.responses import StreamingResponse

from backend.app.api.helpers.extract import extract_cv_text
from backend.app.schemas import DocumentResponse
from backend.database.storage import new_id
from backend.database.db import get_db
from backend.database.models import Document, User, Person, Resume, Job, Application
from backend.app.api.helpers.ownership import get_current_user

from backend.app.api.helpers.quota import consume_ai_quota
from backend.app.pipeline import run_cv_parsing
from backend.app.core.config import settings

router = APIRouter()

STORAGE_DIR = Path(__file__).parent.parent.parent.parent / "storage" / "resumes"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def upload_to_azure(content: bytes, original_filename: str) -> str:
    if not settings.AZURE_STORAGE_CONNECTION_STRING:
        raise HTTPException(status_code=500, detail="Azure Connection String is not configured")

    file_extension = os.path.splitext(original_filename)[1]
    unique_filename = f"doc_{uuid.uuid4().hex[:12]}{file_extension}"

    blob_service_client = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)
    blob_client = blob_service_client.get_blob_client(
        container=settings.AZURE_CONTAINER_NAME,
        blob=unique_filename
    )

    content_settings = None
    if file_extension.lower() == ".pdf":
        content_settings = ContentSettings(content_type="application/pdf")

    blob_client.upload_blob(content, overwrite=True, content_settings=content_settings)
    return blob_client.url


def delete_from_azure(file_url: str):
    if not file_url or not settings.AZURE_STORAGE_CONNECTION_STRING:
        return
    try:
        blob_name = file_url.split('/')[-1]
        blob_service_client = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)
        blob_client = blob_service_client.get_blob_client(
            container=settings.AZURE_CONTAINER_NAME,
            blob=blob_name
        )
        blob_client.delete_blob()
    except Exception as e:
        print(f"Failed to delete blob {file_url}: {e}")


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
        try:
            saved_file_path = upload_to_azure(content, file.filename or "resume.pdf")
        except Exception as e:
            print(f"Azure upload failed, saving locally: {e}")
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
async def get_document_file(
        document_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if current_user.role == "candidate" and doc.owner_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if not doc.file_path:
        raise HTTPException(status_code=404, detail="File path is empty")

    if doc.file_path.startswith("http"):
        try:
            blob_service_client = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)

            blob_name = doc.file_path.split('/')[-1]

            blob_client = blob_service_client.get_blob_client(
                container=settings.AZURE_CONTAINER_NAME,
                blob=blob_name
            )

            if not blob_client.exists():
                raise HTTPException(status_code=404, detail=f"Blob {blob_name} not found in Azure")

            def stream_blob():
                download_stream = blob_client.download_blob()
                for chunk in download_stream.chunks():
                    yield chunk

            return StreamingResponse(
                stream_blob(),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'inline; filename="{doc.filename}"'
                }
            )

        except Exception as e:
            print(f"Azure SDK Error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Azure Storage error: {str(e)}")

    local_path = Path(doc.file_path)
    if local_path.exists():
        return FileResponse(
            path=doc.file_path,
            media_type=doc.content_type or "application/pdf",
            filename=doc.filename,
        )

    raise HTTPException(
        status_code=404,
        detail="File not found on local disk. It might be missing from storage."
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

    if doc.file_path:
        if doc.file_path.startswith("http"):
            delete_from_azure(doc.file_path)
        elif Path(doc.file_path).exists():
            Path(doc.file_path).unlink()

    db.delete(doc)
    db.commit()


@router.post("/documents/save-generated")
async def save_generated_pdf(
        resume_id: str = Form(...),
        file: UploadFile = File(...),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    content = await file.read()
    file_hash = hashlib.sha256(content).hexdigest()

    clean_filename = file.filename if len(file.filename) < 200 else "generated_resume.pdf"
    if clean_filename.startswith("data:"):
        clean_filename = "resume.pdf"

    try:
        azure_url = upload_to_azure(content, clean_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Azure upload failed: {str(e)}")

    doc_id = new_id("doc")
    new_doc = Document(
        document_id=doc_id,
        owner_user_id=current_user.user_id,
        filename=clean_filename,
        content_type="application/pdf",
        file_hash=file_hash,
        file_path=azure_url,
        raw_text="",
        source_type="generated_cv",
        document_role="generated_resume"
    )
    db.add(new_doc)

    resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()
    if resume:
        resume.generated_document_id = doc_id
        resume.generation_status = "generated"

    db.commit()
    return {"status": "ok", "url": azure_url}