from __future__ import annotations

import json

LANGUAGE_NAMES: dict[str, str] = {
    "en": "English",
    "ru": "Russian",
    "de": "German",
    "fr": "French",
    "es": "Spanish",
    "tr": "Turkish",
    "pl": "Polish",
    "pt": "Portuguese",
    "it": "Italian",
    "ar": "Arabic",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "nl": "Dutch",
    "sv": "Swedish",
}

EXTRACT_JOB_TITLE_SCHEMA = {
    "type": "object",
    "properties": {"job_title": {"type": "string"}},
    "required": ["job_title"],
}

FETCH_JOB_URL_SCHEMA = {
    "type": "object",
    "properties": {
        "job_title": {"type": "string"},
        "job_description": {"type": "string"},
    },
    "required": ["job_title", "job_description"],
}


def _strip_photo(resume_data: dict) -> dict:
    pi = resume_data.get("personal_info")
    if not pi or "photo" not in pi:
        return resume_data
    return {**resume_data, "personal_info": {k: v for k, v in pi.items() if k != "photo"}}


def build_translate_resume_prompt(resume_data: dict, language_name: str) -> str:
    resume_data = _strip_photo(resume_data)
    return f"""You are a professional CV/resume translator.

Translate the following resume data JSON into {language_name}.

Rules:
- Translate all free-text content: summaries, descriptions, job titles, degree names, skill names, certification names.
- ALWAYS translate spoken/written language names using their name in {language_name} (e.g. in French: "English"→"Anglais", "German"→"Allemand", "Spanish"→"Espagnol", "French"→"Français"). These are NOT proper nouns — they must be translated.
- Keep proper nouns UNCHANGED: company names, institution names, people's names, URLs, email addresses, phone numbers, programming language names, software/tool names, and technology names.
- Keep all date strings UNCHANGED exactly as they are (e.g. "2020-01", "Present", "2025-06", "2026"). NEVER alter, correct, or normalise any date — dates that appear to be in the future are valid and must be preserved verbatim.
- Keep all JSON field/key names UNCHANGED (keys must stay in English).
- Keep ALL enum/status values UNCHANGED exactly as-is: visa_status values (CITIZEN, PERMANENT_RESIDENT, WORK_PERMIT, STUDENT_VISA, SPONSORED_VISA, NO_WORK_AUTHORIZATION, OTHER, UNKNOWN), work_preference values (ONSITE, HYBRID, REMOTE, FLEXIBLE, UNKNOWN), skill level values (BEGINNER, INTERMEDIATE, ADVANCED, EXPERT, UNKNOWN), language level values (BASIC, INTERMEDIATE, ADVANCED, FLUENT, NATIVE, UNKNOWN), boolean values (true, false), and null values.
- Do NOT add or remove any fields.
- Output ONLY the translated JSON object. No markdown, no explanation.

Resume JSON:
{json.dumps(resume_data, ensure_ascii=False, indent=2)}
"""


def build_adapt_resume_prompt(resume_data: dict, job_description: str, language_name: str) -> str:
    resume_data = _strip_photo(resume_data)
    return f"""You are an expert CV writer and career coach.

Adapt the candidate's resume below to make it maximally suitable for the job description provided.

Rules:
1. Rewrite personal_info.summary to directly address the job's requirements and value proposition using concrete, specific language — no generic filler.
2. Keep all experience entries but rewrite each description to emphasise aspects most relevant to the job. Use short bullet points starting with "• " (bullet + space), one per line, each starting with a strong action verb. Separate each bullet with a single newline character (\\n) — no blank lines between bullets, no double newlines anywhere. Replace generic statements with concrete examples and measurable outcomes wherever possible. Do NOT invent new jobs, companies, or dates.
3. Reorder skills so the most job-relevant ones appear first; remove or deprioritise skills that have no bearing on this role.
4. If certifications or education entries are relevant to the job, briefly mention them in the summary.
5. Keep all factual data unchanged: company names, institution names, dates (including dates that appear to be in the future — they are valid and must not be altered), URLs, email, phone.
6. Keep all JSON field names unchanged (keys stay in English).
7. Keep ALL enum/status values UNCHANGED exactly as-is: visa_status values (CITIZEN, PERMANENT_RESIDENT, WORK_PERMIT, STUDENT_VISA, SPONSORED_VISA, NO_WORK_AUTHORIZATION, OTHER, UNKNOWN), work_preference values (ONSITE, HYBRID, REMOTE, FLEXIBLE, UNKNOWN), skill level values (BEGINNER, INTERMEDIATE, ADVANCED, EXPERT, UNKNOWN), language level values (BASIC, INTERMEDIATE, ADVANCED, FLUENT, NATIVE, UNKNOWN), boolean values, and null values.
8. Write all free-text content in {language_name}: summary, experience descriptions, job titles, degree names, skill names, certification names. For spoken/written language names, ALWAYS translate them to their {language_name} equivalent (e.g. in French: "English"→"Anglais", "German"→"Allemand", "Spanish"→"Espagnol", "French"→"Français").
9. Output ONLY the adapted resume as a valid JSON object. No markdown, no explanation.

Job Description:
{job_description}

Candidate Resume JSON:
{json.dumps(resume_data, ensure_ascii=False, indent=2)}
"""


def build_apply_single_improvement_prompt(resume_data: dict, improvement: str, index: int, total: int) -> str:
    resume_data = _strip_photo(resume_data)
    return f"""You are an expert CV editor. Apply the following improvement to the resume JSON.

IMPROVEMENT {index} OF {total}:
{improvement}

Rules:
- Apply this improvement thoroughly to every relevant section of the resume — do not skip or partially apply it.
- If any field contains photo data, base64-encoded images, or binary content, copy it through unchanged.
- Bullet points must use "• " (bullet + space) at the start, one bullet per line, separated by a single \\n. No blank lines between bullets, no double newlines.
- If you modify personal_info.summary: write in first person, natural human voice — as if a skilled HR professional ghost-wrote it for the candidate. Never use buzzwords or filler such as "results-driven", "dynamic", "passionate", "leverage", "innovative", "proactive", "seasoned", "detail-oriented", or "team player". Every claim must be grounded in the candidate's actual experience.
- Do NOT add, remove, or rename any experience/education/certification entries.
- Keep ALL factual data unchanged: company names, institution names, dates (including future dates — they are valid), URLs, email, phone.
- Keep all JSON field names unchanged (keys stay in English).
- Keep ALL enum values unchanged: visa_status, work_preference, skill level, language level, boolean, null.
- Output ONLY the modified JSON object. No markdown, no explanation.

Resume JSON:
{json.dumps(resume_data, ensure_ascii=False, indent=2)}
"""


def build_cv_parsing_prompt(cv_text: str) -> str:
    return f"""You are an expert HR data extractor.
Extract all candidate information from the following CV text.
If a specific piece of information is missing (like a date, city, or skill level), omit the field or use "UNKNOWN" according to the schema enums.

LANGUAGE DETECTION — REQUIRED:
- Detect the language the CV text is written in and return it as the "language" field.
- Use the ISO 639-1 two-letter code (e.g. "de" for German, "en" for English, "ru" for Russian, "fr" for French, "es" for Spanish, "tr" for Turkish, "pl" for Polish, "pt" for Portuguese, "it" for Italian, "ar" for Arabic, "zh" for Chinese, "ja" for Japanese, "ko" for Korean, "nl" for Dutch, "sv" for Swedish).
- Base this on the actual language of the CV body text, NOT the candidate's native language or spoken languages list.
- If the CV mixes languages, use the dominant one.

DATES — CRITICAL:
- Copy ALL dates exactly as they appear in the CV. NEVER alter, correct, or normalise any date.
- Dates such as 2025, 2026, or later are valid — do NOT treat them as errors or future dates. The candidate may be currently employed or the CV may describe recent/ongoing work. Your training cutoff is irrelevant; use only what the CV says.

CRITICAL RULES FOR EXPERIENCE AND EDUCATION DESCRIPTIONS:
- Copy the FULL description text from the CV exactly as written. Do NOT summarize, shorten, truncate, or paraphrase.
- Include every bullet point, responsibility, achievement, and sentence exactly as it appears.
- Preserve the original wording and detail level.
- FORMAT bullet points consistently: convert any bullet character (-, *, ·, ▪, ▸, ►, etc.) to "• " (bullet + space). Each bullet point goes on its own line separated by a single \\n. Do NOT add blank lines between bullets.
- If the text has no bullet points, keep it as plain prose with no extra blank lines. Use a single \\n for paragraph breaks only where they genuinely exist in the source.
- NEVER add extra blank lines, double newlines (\\n\\n), or leading/trailing whitespace. Text must be compact with no empty gaps.

PHOTO / IMAGE DATA:
- If the CV text contains any photo, embedded image data, base64-encoded content, or binary artifacts, ignore it completely. Do not extract, reference, or process it.

CV TEXT:
{cv_text}
"""


def build_extract_job_title_prompt(job_description: str) -> str:
    return f"""Extract the job title/position name from the job description below.
Return ONLY a JSON object with one key: {{"job_title": "the title"}}
If you cannot determine the title, return {{"job_title": ""}}

Job description:
{job_description[:3000]}"""


def build_fetch_job_from_url_prompt(raw_text: str) -> str:
    return f"""You are an HR data extraction assistant.

Extract the job title and full job description from the web page text below.

Return a JSON object with exactly two keys:
- "job_title": the position/role name (string)
- "job_description": the complete job description including responsibilities, requirements, and qualifications (string)

If the page is not a job posting, set both to empty strings.
Output ONLY the JSON object — no markdown, no explanation.

Page text:
{raw_text}
"""
