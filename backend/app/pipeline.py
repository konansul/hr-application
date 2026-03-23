import logging
from typing import List, Tuple

from backend.app.schemas import ScreeningRequest, ScreeningResult, RequirementCheck, CandidateProfile, Skill
from backend.app.gemini import GeminiClient
from backend.app.services.llm.schemas import SCREENING_SCHEMA
from backend.app.schemas import CVImprovementResult, RewrittenBullet
from backend.app.services.llm.schemas import CV_IMPROVEMENT_SCHEMA

logger = logging.getLogger(__name__)

gemini = GeminiClient()

def _normalize_status(s: str) -> str:
    if not s:
        return "missing"
    s = s.strip().lower()

    if s in {"met", "match", "matched", "ok", "yes"}:
        return "met"
    if s in {"partial", "partially_met", "partly", "some"}:
        return "partial"
    if s in {"missing", "no", "not_met", "absent"}:
        return "missing"
    return "missing"


def _score(profile: CandidateProfile, must: List[str], nice: List[str]) -> Tuple[int, str]:
    skills = {s.name.strip().lower() for s in profile.skills}

    must_met = [r for r in must if r in skills]
    must_miss = [r for r in must if r not in skills]

    nice_met = [r for r in nice if r in skills]
    nice_miss = [r for r in nice if r not in skills]

    must_score = 0 if not must else int(70 * (len(must_met) / len(must)))
    nice_score = 0 if not nice else int(30 * (len(nice_met) / len(nice)))

    total = must_score + nice_score

    if must_miss:
        total = min(total, 60)

    summary = (
        f"Must-have met: {must_met or '—'}, missing: {must_miss or '—'}. "
        f"Nice-to-have met: {nice_met or '—'}, missing: {nice_miss or '—'}."
    )
    return total, summary


def run_screening(request: ScreeningRequest) -> ScreeningResult:
    # Безопасное чтение файла шаблона
    with open("backend/app/services/llm/evaluate_match.md", "r", encoding="utf-8") as f:
        template = f.read()

    prompt = template.replace("{{JD_TEXT}}", request.job_description).replace("{{CV_TEXT}}", request.cv_text)

    # Вызываем наш обновленный метод generate_json
    data = gemini.generate_json(prompt, SCREENING_SCHEMA)

    # profile (добавлена безопасная проверка .get("profile", {}), чтобы избежать KeyError)
    profile_data = data.get("profile", {})
    skills = [Skill(name=s.get("name"), years=s.get("years")) for s in profile_data.get("skills", [])]

    profile = CandidateProfile(
        skills=skills,
        experience_years=profile_data.get("experience_years"),
    )

    must = []
    for x in data.get("must_have", []):
        x = dict(x)
        x["status"] = _normalize_status(x.get("status"))
        must.append(RequirementCheck(**x))

    nice = []
    for x in data.get("nice_to_have", []):
        x = dict(x)
        x["status"] = _normalize_status(x.get("status"))
        nice.append(RequirementCheck(**x))

    score = int(max(0, min(100, data.get("score", 0))))

    return ScreeningResult(
        score=score,
        decision=data.get("decision", "maybe"),
        summary=data.get("summary", ""),
        must_have=must,
        nice_to_have=nice,
        matched_skills=data.get("matched_skills", []),
        missing_skills=data.get("missing_skills", []),
        recommendations=data.get("recommendations", []),
        interview_questions=data.get("interview_questions", []),
        risks=data.get("risks", []),
        profile=profile,
        cv_text_preview=request.cv_text[:1000],
    )


def run_cv_improvement(cv_text: str, job_description: str = "") -> CVImprovementResult:
    with open("backend/app/services/llm/improve_cv.md", "r", encoding="utf-8") as f:
        template = f.read()

    prompt = (
        template
        .replace("{{CV_TEXT}}", cv_text)
        .replace("{{JOB_DESCRIPTION}}", job_description or "Not provided")
    )

    data = gemini.generate_json(prompt, CV_IMPROVEMENT_SCHEMA)

    bullets = [
        RewrittenBullet(
            original=item.get("original", ""),
            improved=item.get("improved", "")
        )
        for item in data.get("rewritten_bullets", [])
    ]

    return CVImprovementResult(
        overall_score=int(max(0, min(100, data.get("overall_score", 0)))),
        summary=data.get("summary", ""),
        strengths=data.get("strengths", []),
        weaknesses=data.get("weaknesses", []),
        missing_keywords=data.get("missing_keywords", []),
        improvements=data.get("improvements", []),
        improved_summary=data.get("improved_summary", ""),
        rewritten_bullets=bullets,
        cv_text_preview=cv_text[:1000],
    )


def run_job_refinement(title: str, description: str) -> str:
    prompt = f"""You are an expert HR Assistant and Technical Recruiter. Your task is to refine, enhance, and finalize job descriptions to attract top candidates.

Input:
- Job Title: {title}
- Draft Description: {description}

Instructions:
1. Analyze the draft description. 
2. If it is too short, expand it professionally by adding:
   - Overview of the role
   - Responsibilities
   - Requirements
   - Local context and location-specific details if not provided
3. If it is too long, improve clarity, fix grammar and style, structure it logically, and enhance professionalism, without rewriting the entire content.
4. Add any standard responsibilities or requirements typical for this role if missing.
5. Make the text clear, professional, and appealing.
6. Return only the improved job description text. Do not include any formatting examples, instructions, or Markdown symbols. The output should be ready to use as a job posting.
"""

    try:
        # Убрали старый fallback-код от Google SDK.
        # Новый метод generate_text сам прекрасно справится с задачей.
        return gemini.generate_text(prompt)
    except Exception as e:
        logger.error(f"Error refining job description: {e}")
        return f"{title}\n\n{description}\n\n(AI refinement failed, please edit manually.)"