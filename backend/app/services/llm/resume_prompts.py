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


def build_translate_resume_prompt(resume_data: dict, language_name: str) -> str:
    return f"""You are a professional CV/resume translator.

Translate the following resume data JSON into {language_name}.

Rules:
- Translate all free-text content: summaries, descriptions, job titles, degree names, skill names, certification names.
- Keep proper nouns UNCHANGED: company names, institution names, people's names, URLs, email addresses, phone numbers, programming language names, software/tool names, and technology names.
- Keep all date strings UNCHANGED (e.g. "2020-01", "Present", "2019").
- Keep all JSON field/key names UNCHANGED (keys must stay in English).
- Do NOT add or remove any fields.
- Output ONLY the translated JSON object. No markdown, no explanation.

Resume JSON:
{json.dumps(resume_data, ensure_ascii=False, indent=2)}
"""


def build_adapt_resume_prompt(resume_data: dict, job_description: str, language_name: str) -> str:
    return f"""You are an expert CV writer and career coach.

Adapt the candidate's resume below to make it maximally suitable for the job description provided.

Rules:
1. Rewrite personal_info.summary to directly address the job's requirements and value proposition using concrete, specific language — no generic filler.
2. Keep all experience entries but rewrite each description to emphasise aspects most relevant to the job. Use short bullet points starting with "• " (bullet space), one per line, each starting with a strong action verb. Separate each bullet with a newline character (\\n). Replace generic statements with concrete examples and measurable outcomes wherever possible. Do NOT invent new jobs, companies, or dates.
3. Reorder skills so the most job-relevant ones appear first; remove or deprioritise skills that have no bearing on this role.
4. If certifications or education entries are relevant to the job, briefly mention them in the summary.
5. Keep all factual data unchanged: company names, institution names, dates, URLs, email, phone.
6. Keep all JSON field names unchanged (keys stay in English).
7. Write all text content in {language_name}.
8. Output ONLY the adapted resume as a valid JSON object. No markdown, no explanation.

Job Description:
{job_description}

Candidate Resume JSON:
{json.dumps(resume_data, ensure_ascii=False, indent=2)}
"""


def build_cv_parsing_prompt(cv_text: str) -> str:
    return f"""You are an expert HR data extractor.
Extract all candidate information from the following CV text.
If a specific piece of information is missing (like a date, city, or skill level), omit the field or use "UNKNOWN" according to the schema enums.

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
