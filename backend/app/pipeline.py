from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Tuple

from backend.app.schemas import (
    ScreeningRequest, ScreeningResult, RequirementCheck,
    CandidateProfile, Skill, CVImprovementResult, RewrittenBullet,
)
from backend.app.gemini import GeminiClient
from backend.app.services.llm.schemas import SCREENING_SCHEMA, CV_IMPROVEMENT_SCHEMA, CV_PARSING_SCHEMA
from backend.app.services.llm.job_templates import LEGAL_TEMPLATES
from backend.app.services.llm.job_prompts import build_job_refinement_prompt
from backend.app.services.llm.resume_prompts import (
    LANGUAGE_NAMES,
    EXTRACT_JOB_TITLE_SCHEMA,
    FETCH_JOB_URL_SCHEMA,
    build_translate_resume_prompt,
    build_adapt_resume_prompt,
    build_cv_parsing_prompt,
    build_extract_job_title_prompt,
    build_fetch_job_from_url_prompt,
)

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
    with open("backend/app/services/llm/evaluate_match.md", "r", encoding="utf-8") as f:
        template = f.read()

    requirements_text = "No strict internal requirements specified."
    if hasattr(request, "requirements") and request.requirements:
        active_reqs = {
            k: v for k, v in request.requirements.model_dump().items()
            if v not in [None, "", "Any", []]
        }
        if active_reqs:
            requirements_text = json.dumps(active_reqs, indent=2, ensure_ascii=False)

    prompt = (
        template
        .replace("{{JD_TEXT}}", request.job_description)
        .replace("{{CV_TEXT}}", request.cv_text)
        .replace("{{REQUIREMENTS_TEXT}}", requirements_text)
    )

    data = gemini.generate_json(prompt, SCREENING_SCHEMA)

    profile_data = data.get("profile", {})
    skills = [Skill(name=s.get("name"), years=s.get("years")) for s in profile_data.get("skills", [])]
    profile = CandidateProfile(skills=skills, experience_years=profile_data.get("experience_years"))

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
        RewrittenBullet(original=item.get("original", ""), improved=item.get("improved", ""))
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


def run_job_refinement(
    title: str,
    description: str,
    region: str | None = None,
    include_di_clause: bool = False,
    include_anti_scam: bool = False,
    include_eeo_statement: bool = False,
    include_pay_transparency: bool = False,
    include_gdpr_notice: bool = False,
    include_eu_salary_law: bool = False,
    include_visa_sponsorship: bool = False,
) -> str:
    prompt = build_job_refinement_prompt(title, description, region)

    try:
        refined_text = gemini.generate_text(prompt)

        clauses = []
        if include_di_clause:
            clauses.append(f"Diversity & Inclusion\n{LEGAL_TEMPLATES['DIVERSITY_GLOBAL']}")
        if include_anti_scam:
            clauses.append(f"Recruitment Security Alert\n{LEGAL_TEMPLATES['ANTI_SCAM']}")

        if region == "US":
            if include_eeo_statement:
                clauses.append(f"Equal Opportunity Employer\n{LEGAL_TEMPLATES['EEO_US']}")
            if include_pay_transparency:
                clauses.append(f"Pay Transparency\n{LEGAL_TEMPLATES['PAY_TRANSPARENCY_US']}")
        elif region == "EU":
            if include_gdpr_notice:
                clauses.append(f"Data Privacy\n{LEGAL_TEMPLATES['GDPR_EU']}")
            if include_eu_salary_law:
                clauses.append(f"Salary Information (KV)\n{LEGAL_TEMPLATES['KV_AUSTRIA']}")
        elif region == "Asia":
            if include_visa_sponsorship:
                clauses.append(f"Visa & Work Authorization\n{LEGAL_TEMPLATES['VISA_SPONSORSHIP_ASIA']}")

        if clauses:
            refined_text += "\n\n---\n\n" + "\n\n".join(clauses)

        return refined_text

    except Exception as e:
        logger.error(f"Error refining job description: {e}")
        loc_str = f" ({region})" if region else ""
        return f"{title}{loc_str}\n\n{description}\n\n(AI refinement failed, please edit manually.)"


def translate_resume_data(resume_data: dict, language_code: str) -> dict:
    language_name = LANGUAGE_NAMES.get(language_code, language_code)
    prompt = build_translate_resume_prompt(resume_data, language_name)

    result_text = gemini.generate_text(prompt, temperature=0.1, max_output_tokens=8192)
    result_text = result_text.strip()
    if result_text.startswith("```"):
        lines = result_text.splitlines()
        inner = lines[1:-1] if lines and lines[-1].strip() == "```" else lines[1:]
        result_text = "\n".join(inner)
    return json.loads(result_text)


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        inner = lines[1:-1] if lines and lines[-1].strip() == "```" else lines[1:]
        text = "\n".join(inner)
    return text


def extract_job_title(job_description: str) -> str:
    prompt = build_extract_job_title_prompt(job_description)
    try:
        result = gemini.generate_json(prompt, EXTRACT_JOB_TITLE_SCHEMA)
        return (result.get("job_title") or "").strip()
    except Exception:
        return ""


def fetch_job_from_url(url: str) -> Dict[str, str]:
    import httpx
    from lxml import html as lhtml

    try:
        response = httpx.get(
            url,
            timeout=15,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; HRBot/1.0; +https://hrai.app)"},
        )
        response.raise_for_status()
    except Exception as e:
        raise RuntimeError(f"Could not fetch URL: {e}")

    try:
        tree = lhtml.fromstring(response.content)
        for tag in tree.xpath("//script|//style|//nav|//footer|//header|//aside"):
            parent = tag.getparent()
            if parent is not None:
                parent.remove(tag)
        raw_text = tree.text_content()
    except Exception:
        raw_text = response.text

    raw_text = re.sub(r"\n{3,}", "\n\n", re.sub(r"[ \t]+", " ", raw_text)).strip()
    raw_text = raw_text[:10000]

    prompt = build_fetch_job_from_url_prompt(raw_text)
    return gemini.generate_json(prompt, FETCH_JOB_URL_SCHEMA)


def adapt_resume_for_job(
    resume_data: Dict[str, Any],
    job_description: str,
    language_code: str,
) -> Dict[str, Any]:
    language_name = LANGUAGE_NAMES.get(language_code, language_code)
    prompt = build_adapt_resume_prompt(resume_data, job_description, language_name)

    result_text = gemini.generate_text(prompt, temperature=0.3, max_output_tokens=8192)
    result_text = _strip_json_fences(result_text)
    return json.loads(result_text)


def run_cv_parsing(cv_text: str) -> dict:
    prompt = build_cv_parsing_prompt(cv_text)
    try:
        return gemini.generate_json(prompt, CV_PARSING_SCHEMA)
    except Exception as e:
        logger.error(f"Error parsing CV text: {e}")
        return {
            "personal_info": {"first_name": "Unknown", "last_name": "Unknown"},
            "experience": [],
            "education": [],
            "skills": [],
            "languages": [],
            "certifications": [],
        }
