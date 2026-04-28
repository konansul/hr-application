from __future__ import annotations

import json
import hashlib
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_


from backend.app.api.models import DocumentResponse
from backend.database.storage import new_id
from backend.database.db import get_db
from backend.database.models import Document, User, Person, Resume, Job, Application
from backend.app.api.helpers.ownership import get_current_user

from backend.app.api.helpers.quota import consume_ai_quota

from backend.app.services.parsing.pdf import pdf_to_text
from backend.app.services.parsing.docx import docx_to_text
from backend.app.services.parsing.clean import clean_text
from backend.app.pipeline import run_cv_parsing

router = APIRouter()

STORAGE_DIR = Path(__file__).parent.parent.parent.parent / "storage" / "resumes"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


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

    try:
        cv_text, doc_content_type = extract_cv_text(file.filename or "", content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # ПРОВЕРЯЕМ И СПИСЫВАЕМ КВОТУ ПЕРЕД НАЧАЛОМ РАБОТЫ ИИ
    consume_ai_quota(db, current_user)

    try:
        parsed_data = run_cv_parsing(cv_text)
    except Exception as e:
        # ЕСЛИ ИИ УПАЛ, ВОЗВРАЩАЕМ КАНДИДАТУ ЕГО ПОПЫТКУ
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

    # 1. Начинаем запрос с таблицы Application
    # Это гарантирует, что мы работаем только с реальными откликами
    query = (
        db.query(Application, Resume, Document, Person)
        .join(Job, Job.job_id == Application.job_id)
        .join(Resume, Resume.resume_id == Application.resume_id)
        .join(Person, Person.person_id == Application.person_id)
        # Присоединяем документ (может быть как оригинал, так и сгенерированный)
        .outerjoin(Document, Document.document_id == Resume.generated_document_id)
        .filter(Job.org_id == hr_org_id)
    )

    # 2. Фильтруем по конкретной вакансии, если она выбрана
    if job_id:
        query = query.filter(Application.job_id == job_id)

    results = query.all()

    final_list = []
    for app, resume, doc, person in results:
        # Если при отклике был сгенерирован PDF, берем его.
        # Если нет (просто текст), используем данные из Resume

        doc_id = doc.document_id if doc else resume.resume_id
        filename = doc.filename if doc else (resume.title or f"Resume_{person.last_name}.pdf")

        final_list.append({
            "document_id": doc_id,
            "owner_user_id": person.user_id,
            "filename": filename,
            "content_type": doc.content_type if doc else "application/pdf",
            "source_type": resume.source_type, # Показываем источник из резюме (UPLOADED или IMPROVE)
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
    # 1. Находим профиль кандидата
    person = db.query(Person).filter(Person.user_id == current_user.user_id).first()
    if not person:
        return []

    # 2. Берем ВСЕ его резюме прямо из таблицы resumes (никаких JOIN с документами!)
    resumes = (
        db.query(Resume)
        .filter(Resume.person_id == person.person_id)
        .order_by(Resume.created_at.desc())
        .all()
    )

    results = []
    for r in resumes:
        # Берем ID документа (оригинала или сгенерированного), чтобы фронт не ругался
        doc_id = r.generated_document_id or r.source_document_id or r.resume_id

        results.append({
            "document_id": doc_id,  # Нужен фронтенду для ключей
            "resume_id": r.resume_id,  # САМОЕ ГЛАВНОЕ: ID для отклика
            "owner_user_id": current_user.user_id,
            "filename": r.title or "My Resume",  # В title у нас лежит имя файла
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


@router.post("/applications/submit")
async def submit_public_application(
        name: str = Form(...),
        email: str = Form(...),
        job_id: str = Form(...),
        file: UploadFile = File(...),
        phone: str = Form(None),
        motivation: str = Form(None),
        position: str = Form(None),
        salary_expectation: str = Form(None),
        education: str = Form(None),
        skills: str = Form(None),
        experience_years: str = Form(None),
        db: Session = Depends(get_db)
):
    content = await file.read()

    try:
        cv_text, doc_content_type = extract_cv_text(file.filename or "", content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 1. Проверяем или создаем пользователя
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
CANDIDATE PUBLIC APPLICATION
---------------------------
Job ID: {job_id}
Name: {name}
Email: {email}
Phone: {phone or 'Not provided'}
Motivation: {motivation or 'Not provided'}
Additional Info: {position or ''} {skills or ''}

ORIGINAL CV TEXT:
{cv_text}
"""

    try:
        parsed_data = run_cv_parsing(enriched_raw_text)
    except Exception:
        parsed_data = {}

    # 2. Проверяем или создаем профиль (Person)
    person = db.query(Person).filter(Person.user_id == user.user_id).first()
    personal_info = parsed_data.get("personal_info", {})

    if not person:
        name_parts = name.split(" ", 1)
        f_name = personal_info.get("first_name") or name_parts[0]
        l_name = personal_info.get("last_name") or (name_parts[1] if len(name_parts) > 1 else "Unknown")

        person = Person(
            person_id=new_id("prs"),
            user_id=user.user_id,
            first_name=f_name,
            last_name=l_name,
            phone=phone or personal_info.get("phone")
        )
        db.add(person)
        db.flush()

    # 3. Сохраняем физический документ
    file_hash = hashlib.sha256(content).hexdigest()
    doc = Document(
        document_id=new_id("doc"),
        owner_user_id=user.user_id,
        filename=file.filename,
        content_type=doc_content_type,
        file_hash=file_hash,
        raw_text=enriched_raw_text,
        source_type="public_application",
        document_role="source_cv"
    )
    db.add(doc)
    db.flush()

    # 4. Создаем запись в таблице резюме (Resume)
    resume = Resume(
        resume_id=new_id("res"),
        person_id=person.person_id,
        language=parsed_data.get("language") or "en",
        title=f"CV: {name} - {file.filename}",
        payload=json.dumps(parsed_data, ensure_ascii=False),
        source_type="public_application",
        source_document_id=doc.document_id,
        generated_document_id=doc.document_id,
        generation_status="generated"
    )
    db.add(resume)
    db.flush()

    new_application = Application(
        application_id=new_id("app"),
        job_id=job_id,
        person_id=person.person_id,
        resume_id=resume.resume_id,
        status="APPLIED"
    )
    db.add(new_application)

    # Сохраняем всё в базу
    db.commit()

    return {
        "status": "success",
        "resume_id": resume.resume_id,
        "application_id": new_application.application_id
    }