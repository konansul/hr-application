from __future__ import annotations

import hashlib
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
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

# @router.get("/documents/organization", response_model=List[DocumentResponse])
# def get_organization_documents(
#         db: Session = Depends(get_db),
#         current_user: User = Depends(get_current_user)
# ):
#     if current_user.role != "hr":
#         raise HTTPException(status_code=403, detail="Only HR can view candidates")
#
#     candidate_users = db.query(User.user_id).filter(User.role == "candidate").subquery()
#     documents = db.query(Document).filter(
#         Document.owner_user_id.in_(candidate_users),
#         Document.source_type.in_(["uploaded_cv", "public_application"])
#     ).all()
#
#     return [
#         {
#             "document_id": d.document_id,
#             "owner_user_id": d.owner_user_id,
#             "filename": d.filename,
#             "content_type": d.content_type,
#             "source_type": d.source_type
#         }
#         for d in documents
#     ]

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
    # 1. Читаем файл и достаем сырой текст
    content = await file.read()
    try:
        cv_text, doc_content_type = extract_cv_text(file.filename or "", content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 2. Создаем технического пользователя, чтобы БД была довольна
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            user_id=new_id("usr"),
            email=email,
            password_hash="no_login_public_user",  # <-- Заглушка пароля для БД
            role="candidate"
        )
        db.add(user)
        db.flush()  # Получаем ID, но пока не коммитим полностью

    # 3. Формируем обогащенный текст для ИИ
    enriched_raw_text = f"""
--- CANDIDATE APPLICATION FORM ---
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

--- ORIGINAL CV TEXT ---
{cv_text}
"""

    # 4. Сохраняем документ в БД
    file_hash = hashlib.sha256(content).hexdigest()

    # # Защита от спама (ищем по хэшу файла)
    # existing_doc = db.query(Document).filter(
    #     Document.file_hash == file_hash
    # ).first()
    #
    # if existing_doc:
    #     raise HTTPException(status_code=409, detail="This exact CV has already been submitted.")

    doc = Document(
        document_id=new_id("doc"),
        owner_user_id=user.user_id,  # <--- Привязываем файл к нашему пользователю!
        filename=file.filename,
        content_type=doc_content_type,
        file_hash=file_hash,
        raw_text=enriched_raw_text,
        source_type="public_application"
    )

    db.add(doc)
    db.commit()

    return {
        "status": "success",
        "message": "Application saved to database successfully",
        "document_id": doc.document_id
    }