import json
from fastapi import Form, UploadFile, File, Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from backend.app.api.applications import BulkScreenRequest
from backend.app.api.helpers.extract import extract_cv_text
from backend.app.api.helpers.ownership import get_current_user
from backend.app.api.helpers.quota import consume_ai_quota
from backend.app.pipeline import run_cv_parsing, run_screening
from backend.app.schemas import JobRequirementsBase, ScreeningRequest, ScreeningResult
from backend.database.db import get_db
from backend.database.models import User, Job, Person, Resume, Application, Document, ScreeningResult
from backend.database.storage import new_id

router = APIRouter()


def get_cleaned_requirements(req_json):
    if not req_json:
        return None
    try:
        req_data = json.loads(req_json) if isinstance(req_json, str) else req_json

        defaults = {
            "workFormat": "Any",
            "willingToRelocate": False,
            "remoteCountryRestriction": "",
            "officeDaysRequired": "",
            "timeZoneMatch": "",
            "openToDifferentTimeZone": False,
            "visaSponsorship": False,
            "validWorkPermitRequired": True,
            "salaryMin": "",
            "salaryMax": "",
            "currency": "USD",
            "salaryExpectationRequired": False,
            "maxNoticePeriod": "",
            "immediateStartRequired": False,
            "minExperienceYears": "",
            "maxExperienceYears": "",
            "requiredSeniority": "Any",
            "mandatorySkills": "",
            "mandatoryTechnologies": "",
            "minEducation": "Any",
            "degreeField": "",
            "mandatoryCertifications": "",
            "willingToTravel": False,
            "drivingLicense": False,
            "languageRequirements": ""
        }

        cleaned = {}
        has_real_data = False

        for k, default_v in defaults.items():
            v = req_data.get(k, default_v)
            if v == default_v or v in ["", "Any", "UNKNOWN", False]:
                cleaned[k] = None
            else:
                cleaned[k] = v
                has_real_data = True

        if not has_real_data:
            return None

        return JobRequirementsBase(**cleaned)
    except Exception:
        return None


@router.post("/screening/run-file")
async def run_file(
        job_id: str = Form(...),
        file: UploadFile = File(...),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can use this endpoint")

    job = db.query(Job).filter(Job.job_id == job_id, Job.org_id == current_user.org_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    data = await file.read()
    try:
        cv_text, content_type = extract_cv_text(file.filename or "", data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    consume_ai_quota(db, current_user)

    try:
        parsed_data = run_cv_parsing(cv_text)

        person = Person(
            person_id=new_id("prs"),
            user_id=current_user.user_id,
            first_name=parsed_data.get("personal_info", {}).get("first_name", "Unknown"),
            last_name=parsed_data.get("personal_info", {}).get("last_name", "Unknown"),
            city=parsed_data.get("personal_info", {}).get("city")
        )
        db.add(person)
        db.flush()

        resume = Resume(
            resume_id=new_id("res"),
            person_id=person.person_id,
            payload=json.dumps(parsed_data, ensure_ascii=False)
        )
        db.add(resume)
        db.flush()

        application = Application(
            application_id=new_id("app"),
            job_id=job.job_id,
            person_id=person.person_id,
            resume_id=resume.resume_id,
            status="Applied"
        )
        db.add(application)
        db.flush()

        req_obj = get_cleaned_requirements(job.requirements)

        request = ScreeningRequest(
            cv_text=resume.payload,
            job_description=job.description,
            requirements=req_obj
        )

        ai_result = run_screening(request)

        db_result = ScreeningResult(
            result_id=new_id("scr"),
            application_id=application.application_id,
            score=ai_result.score,
            decision=ai_result.decision,
            full_result_json=ai_result.model_dump_json(),
        )

        db.add(db_result)
        db.commit()

        return {
            "application_id": application.application_id,
            "result_id": db_result.result_id,
            "score": db_result.score,
            "decision": db_result.decision,
            "full_result": json.loads(db_result.full_result_json)
        }
    except Exception as e:
        db.rollback()
        if current_user.ai_used > 0:
            current_user.ai_used -= 1
            db.commit()
        raise HTTPException(status_code=500, detail=f"AI Screening failed: {str(e)}")


@router.post("/screening/bulk")
def bulk_screen(
        req: BulkScreenRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR can run screening")

    job = db.query(Job).filter(Job.job_id == req.job_id, Job.org_id == current_user.org_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found in your organization")

    if not req.document_ids:
        raise HTTPException(status_code=400, detail="No items selected for screening")

    results_to_return = []
    req_obj = get_cleaned_requirements(job.requirements)

    for item_id in req.document_ids:
        try:
            consume_ai_quota(db, current_user)
        except HTTPException as e:
            if e.status_code == 429:
                break
            raise e

        try:
            resume = None
            filename = "Unknown_Resume.pdf"

            if item_id.startswith("res_"):
                resume = db.query(Resume).filter(Resume.resume_id == item_id).first()
            elif item_id.startswith("virtual_res_") or item_id.startswith("virtual_"):
                clean_id = item_id.replace("virtual_res_", "").replace("virtual_", "")
                resume = db.query(Resume).filter(Resume.resume_id == clean_id).first()
            else:
                doc = db.query(Document).filter(Document.document_id == item_id).first()
                if doc:
                    filename = doc.filename
                    resume = db.query(Resume).filter(
                        (Resume.source_document_id == doc.document_id) |
                        (Resume.generated_document_id == doc.document_id)
                    ).first()

            if not resume:
                if current_user.ai_used > 0:
                    current_user.ai_used -= 1
                    db.commit()
                continue

            if resume.title:
                filename = resume.title

            cv_text_for_ai = resume.payload

            app = db.query(Application).filter(
                Application.job_id == job.job_id,
                Application.resume_id == resume.resume_id
            ).first()

            if not app:
                app = Application(
                    application_id=new_id("app"),
                    job_id=job.job_id,
                    person_id=resume.person_id,
                    resume_id=resume.resume_id,
                    status="APPLIED"
                )
                db.add(app)
                db.flush()

            db.query(ScreeningResult).filter(ScreeningResult.application_id == app.application_id).delete()
            db.flush()

            request = ScreeningRequest(
                cv_text=cv_text_for_ai,
                job_description=req.job_description,
                requirements=req_obj
            )

            ai_result = run_screening(request)
            ai_data = ai_result.model_dump() if hasattr(ai_result, 'model_dump') else ai_result

            db_res = ScreeningResult(
                result_id=new_id("scr"),
                application_id=app.application_id,
                score=ai_data.get("score", 0),
                decision=ai_data.get("decision", "maybe"),
                full_result_json=json.dumps(ai_data, ensure_ascii=False),
            )
            db.add(db_res)
            db.flush()

            results_to_return.append({
                "application_id": app.application_id,
                "result_id": db_res.result_id,
                "filename": filename,
                "score": db_res.score,
                "decision": db_res.decision,
                "status": "Completed",
                "summary": ai_data.get("summary", ""),
                "matched_skills": ai_data.get("matched_skills", []),
                "missing_skills": ai_data.get("missing_skills", []),
                "risks": ai_data.get("risks", []),
                "interview_questions": ai_data.get("interview_questions", []),
                "recommendations": ai_data.get("recommendations", []),
                "full_result": ai_data
            })

        except Exception as e:
            db.rollback()
            if current_user.ai_used > 0:
                current_user.ai_used -= 1
                db.commit()
            continue

    db.commit()
    return results_to_return


@router.get("/screening/results/{job_id}")
def get_job_screening_results(
        job_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    job = db.query(Job).filter(Job.job_id == job_id, Job.org_id == current_user.org_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    apps = (
        db.query(Application, ScreeningResult, Resume, Document)
        .join(ScreeningResult, ScreeningResult.application_id == Application.application_id)
        .join(Resume, Resume.resume_id == Application.resume_id)
        .outerjoin(Document, Resume.source_document_id == Document.document_id)
        .filter(Application.job_id == job_id)
        .all()
    )

    results = []
    for app, scr, res, doc in apps:
        full_res = json.loads(scr.full_result_json)

        real_filename = (doc.filename if doc else None) or res.title or "Candidate Resume"

        results.append({
            "application_id": app.application_id,
            "filename": real_filename,
            "score": scr.score,
            "decision": scr.decision,
            "summary": full_res.get("summary"),
            "matched_skills": full_res.get("matched_skills", []),
            "missing_skills": full_res.get("missing_skills", []),
            "risks": full_res.get("risks", []),
        })

    return results