from html.parser import HTMLParser


class _TextExtractor(HTMLParser):

    _SKIP = {'script', 'style', 'noscript'}

    def __init__(self):
        super().__init__()
        self._parts: list[str] = []
        self._depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in self._SKIP:
            self._depth += 1

    def handle_endtag(self, tag):
        if tag in self._SKIP and self._depth:
            self._depth -= 1

    def handle_data(self, data):
        if not self._depth:
            t = data.strip()
            if t:
                self._parts.append(t)

    def text(self) -> str:
        return '\n'.join(self._parts)


def _html_to_text(html: str) -> str:
    p = _TextExtractor()
    p.feed(html)
    return p.text()


def _fmt_date(d) -> str:
    if not d:
        return ""
    if isinstance(d, str):
        return d
    if isinstance(d, dict):
        year = d.get("year", "")
        if not year:
            return ""
        month = str(d.get("month", 1)).zfill(2)
        day = str(d.get("day", 1)).zfill(2)
        return f"{year}-{month}-{day}"
    return ""


def _map_linkedin_to_profile(data: dict, source_url: str, existing_email: str = "") -> dict:
    experiences = []
    for exp in (data.get("experiences") or data.get("experience") or []):
        if not isinstance(exp, dict):
            continue
        end = exp.get("ends_at") or exp.get("end_date") or exp.get("end")
        experiences.append({
            "title": exp.get("title") or exp.get("job_title") or "",
            "company": exp.get("company") or exp.get("company_name") or "",
            "start_date": _fmt_date(exp.get("starts_at") or exp.get("start_date") or exp.get("start")),
            "end_date": _fmt_date(end),
            "is_current": not end,
            "description": exp.get("description") or "",
        })

    education = []
    for edu in (data.get("educations") or data.get("education") or []):
        if not isinstance(edu, dict):
            continue
        education.append({
            "institution": edu.get("school") or edu.get("institution") or edu.get("school_name") or "",
            "degree": edu.get("degree_name") or edu.get("degree") or "",
            "field_of_study": edu.get("field_of_study") or edu.get("field") or "",
            "start_date": _fmt_date(edu.get("starts_at") or edu.get("start_date") or edu.get("start")),
            "end_date": _fmt_date(edu.get("ends_at") or edu.get("end_date") or edu.get("end")),
            "description": edu.get("description") or "",
        })

    skills = []
    for s in (data.get("skills") or []):
        if isinstance(s, str) and s:
            skills.append({"name": s, "level": ""})
        elif isinstance(s, dict):
            name = s.get("name") or s.get("skill") or ""
            if name:
                skills.append({"name": name, "level": s.get("endorsement_count", "")})

    languages = []
    for l in (data.get("languages") or []):
        if isinstance(l, str):
            languages.append({"language": l, "proficiency": ""})
        elif isinstance(l, dict):
            name = l.get("name") or l.get("language") or ""
            if name:
                languages.append({"language": name, "proficiency": l.get("proficiency", "")})

    certifications = []
    for c in (data.get("certifications") or []):
        if not isinstance(c, dict):
            continue
        certifications.append({
            "name": c.get("name") or c.get("title") or "",
            "issuer": c.get("authority") or c.get("issuer") or c.get("company") or "",
            "date": _fmt_date(c.get("starts_at") or c.get("date") or c.get("issued_date")),
        })

    city = data.get("city") or data.get("location_city") or ""
    country = (data.get("country_full_name") or data.get("country")
               or data.get("location_country") or "")
    summary = data.get("summary") or data.get("about") or data.get("bio") or ""

    return {
        "personal_info": {
            "first_name": data.get("first_name") or "",
            "last_name": data.get("last_name") or "",
            "email": existing_email,
            "phone": data.get("phone") or "",
            "city": city,
            "country": country,
            "nationality": "",
            "visa_status": "UNKNOWN",
            "work_preference": "UNKNOWN",
            "open_to_remote": False,
            "open_to_relocation": False,
            "linkedin_url": linkedin_url,
            "github_url": "",
            "portfolio_url": "",
            "summary": summary,
        },
        "experience": experiences,
        "education": education,
        "skills": skills,
        "languages": languages,
        "certifications": certifications,
        "references": [],
    }