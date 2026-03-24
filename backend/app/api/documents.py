from __future__ import annotations

import hashlib
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from backend.app.api.models import DocumentResponse
from backend.database.storage import new_id
from backend.database.db import get_db
from backend.database.models import Document, User
from backend.app.api.helpers.ownership import get_current_user

from backend.app.services.parsing.pdf import pdf_to_text
from backend.app.services.parsing.docx import docx_to_text
from backend.app.services.parsing.clean import clean_text

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

    try:
        cv_text, doc_content_type = extract_cv_text(file.filename or "", content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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
    db.commit()
    db.refresh(doc)

    return {
        "document_id": doc.document_id,
        "owner_user_id": doc.owner_user_id,
        "filename": doc.filename,
        "content_type": doc.content_type,
        "source_type": doc.source_type
    }

@router.get("/documents/organization", response_model=List[DocumentResponse])
def get_organization_documents(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can view candidates")

    candidate_users = db.query(User.user_id).filter(User.role == "candidate").subquery()
    documents = db.query(Document).filter(
        Document.owner_user_id.in_(candidate_users),
        Document.source_type == "uploaded_cv"
    ).all()

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