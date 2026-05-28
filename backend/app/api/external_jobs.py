from __future__ import annotations

import asyncio
import json
import os
import re
import time
from collections import OrderedDict
from dataclasses import dataclass, field

import httpx
from fastapi import APIRouter, Query

router = APIRouter()

ADZUNA_APP_ID  = os.getenv("ADZUNA_APP_ID", "")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "")
RAPIDAPI_KEY   = os.getenv("RAPIDAPI_KEY", "")

CACHE_TTL_SECONDS = int(os.getenv("JOB_CACHE_TTL", "3600"))
MAX_CACHE_ENTRIES = int(os.getenv("JOB_CACHE_MAX", "500"))


# ── In-memory LRU cache ──────────────────────────────────────────────────────

@dataclass
class _CacheEntry:
    result: dict
    stored_at: float = field(default_factory=time.monotonic)

    def is_fresh(self) -> bool:
        return (time.monotonic() - self.stored_at) < CACHE_TTL_SECONDS


_cache: OrderedDict[str, _CacheEntry] = OrderedDict()
_cache_lock = asyncio.Lock()


def _cache_key(title: str, loc: str, emp: str, page: int) -> str:
    import re as _re
    normalised = _re.sub(r'\s+', ' ', title.lower().strip())
    return f"{normalised}|{loc}|{emp}|{page}"


async def _cache_get(key: str) -> dict | None:
    async with _cache_lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        if not entry.is_fresh():
            del _cache[key]
            return None
        _cache.move_to_end(key)
        return entry.result


async def _cache_set(key: str, result: dict) -> None:
    async with _cache_lock:
        if key in _cache:
            _cache.move_to_end(key)
        else:
            if len(_cache) >= MAX_CACHE_ENTRIES:
                _cache.popitem(last=False)
        _cache[key] = _CacheEntry(result=result)


# ── Location tables ──────────────────────────────────────────────────────────

# JSearch: location value → (display location string, strip words, ISO country code)
_JSEARCH_LOC: dict[str, tuple[str, str, str]] = {
    "austria":     ("Austria",              "vienna austria graz",          "at"),
    "portugal":    ("Portugal",             "lisbon porto portugal",        "pt"),
    "sweden":      ("Sweden",               "stockholm gothenburg sweden",  "se"),
    "norway":      ("Norway",               "oslo bergen norway",           "no"),
    "denmark":     ("Denmark",              "copenhagen aarhus denmark",    "dk"),
    "finland":     ("Finland",              "helsinki espoo finland",       "fi"),
    "ireland":     ("Ireland",              "dublin cork ireland",          "ie"),
    "czech":       ("Czech Republic",       "prague brno czech",            "cz"),
    "ukraine":     ("Ukraine",              "kyiv lviv ukraine",            "ua"),
    "romania":     ("Romania",              "bucharest cluj romania",       "ro"),
    "greece":      ("Greece",               "athens greece",                "gr"),
    "hungary":     ("Hungary",              "budapest hungary",             "hu"),
    "latvia":      ("Latvia",               "riga latvia",                  "lv"),
    "lithuania":   ("Lithuania",            "vilnius lithuania",            "lt"),
    "estonia":     ("Estonia",              "tallinn estonia",              "ee"),
    "croatia":     ("Croatia",              "zagreb croatia",               "hr"),
    "uae":         ("United Arab Emirates", "dubai abu dhabi uae",          "ae"),
    "israel":      ("Israel",               "tel aviv jerusalem israel",    "il"),
    "japan":       ("Japan",                "tokyo osaka kyoto japan",      "jp"),
}

# Adzuna: location value → (country code, city filter)
_ADZUNA_LOC: dict[str, tuple[str, str]] = {
    "remote":       ("gb", ""),
    "europe":       ("gb", ""),
    "usa":          ("us", ""),
    "uk":           ("gb", ""),
    "canada":       ("ca", ""),
    "germany":      ("de", ""),
    "france":       ("fr", ""),
    "netherlands":  ("nl", ""),
    "poland":       ("pl", ""),
    "spain":        ("es", ""),
    "italy":        ("it", ""),
    "switzerland":  ("ch", ""),
    "austria":      ("at", ""),
    "belgium":      ("be", ""),
    "australia":    ("au", ""),
    "singapore":    ("sg", ""),
    "india":        ("in", ""),
    "brazil":       ("br", ""),
    "mexico":       ("mx", ""),
    "south-africa": ("za", ""),
    "new-zealand":  ("nz", ""),
    "london":       ("gb", "London"),
    "manchester":   ("gb", "Manchester"),
    "birmingham":   ("gb", "Birmingham"),
    "edinburgh":    ("gb", "Edinburgh"),
    "bristol":      ("gb", "Bristol"),
    "new-york":     ("us", "New York"),
    "sf-bay":       ("us", "San Francisco"),
    "los-angeles":  ("us", "Los Angeles"),
    "seattle":      ("us", "Seattle"),
    "austin":       ("us", "Austin"),
    "boston":       ("us", "Boston"),
    "chicago":      ("us", "Chicago"),
    "denver":       ("us", "Denver"),
    "miami":        ("us", "Miami"),
    "dc":           ("us", "Washington"),
    "toronto":      ("ca", "Toronto"),
    "vancouver":    ("ca", "Vancouver"),
    "montreal":     ("ca", "Montreal"),
}

# City → country for query parsing
_CITY_TO_COUNTRY: dict[str, str] = {
    "oslo": "Norway", "bergen": "Norway",
    "stockholm": "Sweden", "gothenburg": "Sweden",
    "copenhagen": "Denmark", "aarhus": "Denmark",
    "helsinki": "Finland", "espoo": "Finland",
    "dublin": "Ireland", "cork": "Ireland",
    "prague": "Czech Republic", "brno": "Czech Republic",
    "kyiv": "Ukraine", "kiev": "Ukraine", "lviv": "Ukraine",
    "bucharest": "Romania", "cluj": "Romania",
    "athens": "Greece",
    "budapest": "Hungary",
    "riga": "Latvia",
    "vilnius": "Lithuania",
    "tallinn": "Estonia",
    "zagreb": "Croatia",
    "dubai": "United Arab Emirates", "abu dhabi": "United Arab Emirates",
    "tel aviv": "Israel",
    "tokyo": "Japan", "osaka": "Japan",
    "lisbon": "Portugal", "porto": "Portugal",
    "vienna": "Austria", "wien": "Austria",
    "berlin": "Germany", "munich": "Germany", "hamburg": "Germany",
    "paris": "France",
    "amsterdam": "Netherlands",
    "warsaw": "Poland",
    "madrid": "Spain", "barcelona": "Spain",
    "rome": "Italy", "milan": "Italy",
    "zurich": "Switzerland", "geneva": "Switzerland",
    "brussels": "Belgium",
    "london": "United Kingdom", "manchester": "United Kingdom",
    "toronto": "Canada", "vancouver": "Canada",
    "new york": "United States", "san francisco": "United States",
    "seattle": "United States", "austin": "United States",
    "sydney": "Australia", "melbourne": "Australia",
    "singapore": "Singapore",
}

# Maps city/country keywords in query text → location_value key
_QUERY_TO_LOC: dict[str, str] = {
    "vienna": "austria",    "wien": "austria",      "austria": "austria",
    "lisbon": "portugal",   "porto": "portugal",    "portugal": "portugal",
    "dubai": "uae",         "abu dhabi": "uae",     "uae": "uae",
    "stockholm": "sweden",  "sweden": "sweden",
    "oslo": "norway",       "norway": "norway",
    "copenhagen": "denmark","denmark": "denmark",
    "helsinki": "finland",  "finland": "finland",
    "dublin": "ireland",    "ireland": "ireland",
    "prague": "czech",      "brno": "czech",        "czech": "czech",
    "kyiv": "ukraine",      "kiev": "ukraine",      "ukraine": "ukraine",
    "bucharest": "romania", "romania": "romania",
    "athens": "greece",     "greece": "greece",
    "budapest": "hungary",  "hungary": "hungary",
    "riga": "latvia",       "latvia": "latvia",
    "vilnius": "lithuania", "lithuania": "lithuania",
    "tallinn": "estonia",   "estonia": "estonia",
    "zagreb": "croatia",    "croatia": "croatia",
    "tel aviv": "israel",   "israel": "israel",
    "tokyo": "japan",       "osaka": "japan",       "japan": "japan",
}


# ── URL helpers ──────────────────────────────────────────────────────────────

def _ensure_https(url: str) -> str:
    if not url:
        return url
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return "https://" + url


def _unwrap_redirect_url(url: str) -> str:
    from urllib.parse import urlparse, parse_qs, unquote
    if not url:
        return url
    try:
        parsed = urlparse(url)
        qs = parse_qs(parsed.query)
        for param in ("redirectUrl", "redirect_url", "url", "dest", "destination"):
            if param in qs:
                return unquote(qs[param][0])
    except Exception:
        pass
    return url


async def _resolve_final_url(url: str) -> str:
    if not url:
        return url
    try:
        async with httpx.AsyncClient(
            timeout=4.0, follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; HRBot/1.0)"},
        ) as client:
            r = await client.head(url)
            return _ensure_https(_unwrap_redirect_url(str(r.url)))
    except Exception:
        return _ensure_https(_unwrap_redirect_url(url))


# ── Query parsers ────────────────────────────────────────────────────────────

_REMOTE_SIGNALS = frozenset({
    "remote", "wfh", "work from home", "work-from-home", "anywhere", "distributed",
})

_LOCATION_STOP_WORDS = frozenset({
    "in", "at", "near", "from", "for", "to", "based",
    "job", "jobs", "work", "working", "position", "role",
    "opportunity", "opportunities", "remote", "hybrid", "onsite", "on-site",
})

_LLM_PARSE_PROMPT = """\
Extract job search parameters from the user query and return a JSON object.

Fields:
- "title": job title or keywords (string, required, never empty)
- "location": location_value key to search in — must be one of the allowed keys or empty string
- "remote": true only if the user explicitly wants remote work (boolean)

Allowed location_value keys:
austria, portugal, sweden, norway, denmark, finland, ireland, czech, ukraine, romania,
greece, hungary, latvia, lithuania, estonia, croatia, uae, israel, japan,
usa, uk, canada, germany, france, netherlands, poland, spain, italy, switzerland,
belgium, australia, singapore, india, brazil, mexico, south-africa, new-zealand,
london, new-york, sf-bay, toronto

Examples:
"data analyst in Oslo" -> {{"title": "data analyst", "location": "norway", "remote": false}}
"remote React developer in Portugal" -> {{"title": "React developer", "location": "portugal", "remote": true}}
"senior software engineer" -> {{"title": "senior software engineer", "location": "", "remote": false}}
"Python developer wfh Stockholm" -> {{"title": "Python developer", "location": "sweden", "remote": true}}
"junior data engineer Dublin" -> {{"title": "junior data engineer", "location": "ireland", "remote": false}}

User query: "{query}"

Respond with only the JSON object, no markdown, no explanation."""


def _parse_query_regex(raw_query: str) -> dict:
    q = raw_query.strip()
    q_lower = q.lower()

    remote = any(sig in q_lower for sig in _REMOTE_SIGNALS)

    loc_key = ""
    # Check multi-word city phrases first
    for keyword in sorted(_QUERY_TO_LOC, key=len, reverse=True):
        if keyword in q_lower:
            loc_key = _QUERY_TO_LOC[keyword]
            break

    # Strip location/stop words to get a clean title
    loc_entry = _JSEARCH_LOC.get(loc_key)
    strip_words = set((loc_entry[1] if loc_entry else "").split()) | _LOCATION_STOP_WORDS
    title_words = [w for w in q.split() if w.lower() not in strip_words]
    title = " ".join(title_words).strip(" ,;-") or q

    return {"title": title, "location": loc_key, "remote": remote}


async def _parse_query_llm(raw_query: str) -> dict | None:
    try:
        from backend.app.gemini import GeminiClient
        gc = GeminiClient()
        prompt = _LLM_PARSE_PROMPT.format(query=raw_query.replace('"', "'"))
        raw = await asyncio.wait_for(
            asyncio.to_thread(gc.generate_text, prompt, 0.0, 150),
            timeout=6.0,
        )
        raw = re.sub(r"^```[a-zA-Z]*\s*", "", raw.strip())
        raw = re.sub(r"\s*```$", "", raw)
        parsed = json.loads(raw)
        if isinstance(parsed.get("title"), str) and parsed["title"]:
            return {
                "title":    parsed["title"],
                "location": str(parsed.get("location", "")),
                "remote":   bool(parsed.get("remote", False)),
            }
    except Exception:
        pass
    return None


async def _parse_query(raw_query: str) -> dict:
    result = await _parse_query_llm(raw_query)
    if result is None:
        result = _parse_query_regex(raw_query)
    return result


# ── JSearch provider ─────────────────────────────────────────────────────────

async def _search_jsearch(title: str, loc_key: str, employment_type: str, page: int) -> dict:
    loc_entry = _JSEARCH_LOC.get(loc_key, (loc_key, "", ""))
    location_str, _, country_iso = loc_entry

    job_query = title if title else "jobs"

    params: dict = {
        "query":       job_query,
        "location":    location_str,
        "page":        str(page),
        "num_pages":   "1",
        "date_posted": "all",
    }
    if country_iso:
        params["country"] = country_iso
    if employment_type == "remote":
        params["remote_jobs_only"] = "true"
    elif employment_type == "full-time":
        params["employment_types"] = "FULLTIME"
    elif employment_type == "part-time":
        params["employment_types"] = "PARTTIME"
    elif employment_type == "contract":
        params["employment_types"] = "CONTRACTOR"

    headers = {
        "X-RapidAPI-Key":  RAPIDAPI_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get("https://jsearch.p.rapidapi.com/search", params=params, headers=headers)
        if not r.is_success:
            raise RuntimeError(f"JSearch HTTP {r.status_code}: {r.text[:300]}")
        data = r.json()

    jobs = []
    for item in data.get("data", []):
        city    = item.get("job_city", "") or ""
        country = item.get("job_country", "") or ""
        loc_str = ", ".join(filter(None, [city, country]))
        jobs.append({
            "job_id":        f"jsearch_{item.get('job_id', '')}",
            "title":         item.get("job_title", ""),
            "description":   item.get("job_description", "") or "",
            "company":       item.get("employer_name", ""),
            "location":      loc_str,
            "salary_min":    item.get("job_min_salary"),
            "salary_max":    item.get("job_max_salary"),
            "url":           _ensure_https(item.get("job_apply_link", "")),
            "created_at":    item.get("job_posted_at_datetime_utc", ""),
            "contract_time": item.get("job_employment_type", ""),
            "tags":          [],
            "remote":        bool(item.get("job_is_remote", False)),
            "source":        "jsearch",
        })

    api_total = data.get("num_pages", 1) * len(jobs) if jobs else 0
    return {"jobs": jobs, "total": api_total, "page": page, "source": "jsearch"}


# ── Adzuna provider ──────────────────────────────────────────────────────────

async def _search_adzuna(title: str, loc_key: str, employment_type: str, page: int) -> dict:
    loc_entry = _ADZUNA_LOC.get(loc_key)
    if not loc_entry:
        return {"jobs": [], "total": 0, "page": page, "source": "unsupported"}
    country, where = loc_entry

    params: dict = {
        "app_id":           ADZUNA_APP_ID,
        "app_key":          ADZUNA_APP_KEY,
        "results_per_page": 20,
        "content-type":     "application/json",
    }
    effective_query = f"remote {title}".strip() if employment_type == "remote" else title
    if effective_query:
        params["what"] = effective_query
    if where:
        params["where"] = where
    if employment_type == "full-time":
        params["full_time"] = 1
    elif employment_type == "part-time":
        params["part_time"] = 1
    elif employment_type == "contract":
        params["contract"] = 1

    url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/{page}"
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        data = r.json()

    raw_jobs, raw_urls = [], []
    for item in data.get("results", []):
        raw_urls.append(item.get("redirect_url", ""))
        raw_jobs.append({
            "job_id":        f"adzuna_{item.get('id', '')}",
            "title":         item.get("title", ""),
            "description":   item.get("description", ""),
            "company":       item.get("company", {}).get("display_name", ""),
            "location":      item.get("location", {}).get("display_name", ""),
            "salary_min":    item.get("salary_min"),
            "salary_max":    item.get("salary_max"),
            "created_at":    item.get("created", ""),
            "contract_time": item.get("contract_time", ""),
            "tags":          [],
            "remote":        False,
            "source":        "adzuna",
        })

    resolved_urls = await asyncio.gather(*[_resolve_final_url(u) for u in raw_urls])
    jobs = [{**job, "url": url} for job, url in zip(raw_jobs, resolved_urls)]
    return {"jobs": jobs, "total": data.get("count", 0), "page": page, "source": "adzuna"}


# ── Debug & stats endpoints ──────────────────────────────────────────────────

@router.get("/api/external-jobs/debug-jsearch")
async def debug_jsearch(q: str = Query("developer"), loc: str = Query("norway")):
    if not RAPIDAPI_KEY:
        return {"error": "RAPIDAPI_KEY not set"}
    loc_entry = _JSEARCH_LOC.get(loc, (loc, "", ""))
    location_str, _, country_iso = loc_entry
    params: dict = {
        "query":       q,
        "location":    location_str,
        "page":        "1",
        "num_pages":   "1",
        "date_posted": "all",
    }
    if country_iso:
        params["country"] = country_iso
    headers = {"X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": "jsearch.p.rapidapi.com"}
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get("https://jsearch.p.rapidapi.com/search", params=params, headers=headers)
    body = r.json() if r.is_success else r.text[:500]
    count = len(body.get("data", [])) if isinstance(body, dict) else "n/a"
    return {"status": r.status_code, "params_sent": params, "result_count": count,
            "sample": body.get("data", [])[:2] if isinstance(body, dict) else body}


@router.get("/api/external-jobs/cache-stats")
async def cache_stats():
    async with _cache_lock:
        total = len(_cache)
        fresh = sum(1 for e in _cache.values() if e.is_fresh())
    return {
        "entries_total": total,
        "entries_fresh": fresh,
        "ttl_seconds":   CACHE_TTL_SECONDS,
        "max_entries":   MAX_CACHE_ENTRIES,
    }


@router.post("/api/external-jobs/cache-clear")
async def cache_clear():
    """Flush the entire in-memory job cache (useful after backend code changes)."""
    async with _cache_lock:
        cleared = len(_cache)
        _cache.clear()
    return {"cleared": cleared, "message": f"Removed {cleared} cached entries."}


# ── Main search endpoint ─────────────────────────────────────────────────────

@router.get("/api/external-jobs/search")
async def search_external_jobs(
    q: str = Query(""),
    location_value: str = Query("all"),
    employment_type: str = Query(""),
    level: str = Query(""),
    page: int = Query(1, ge=1),
):
    emp = "" if employment_type in ("all", "") else employment_type
    loc = "" if location_value in ("all", "") else location_value

    # ── Parse free-text query ─────────────────────────────────────────────────
    raw_query = f"{level} {q}".strip() if level and level not in ("all", "") else q

    if raw_query:
        parsed = await _parse_query(raw_query)
    else:
        parsed = {"title": "", "location": "", "remote": False}

    title  = parsed["title"]
    remote = parsed["remote"] or emp == "remote"

    # Dropdown selection overrides parsed location
    effective_loc = loc or parsed.get("location", "")

    # ── Cache — key on the raw query so LLM non-determinism can't cause misses ─
    cache_key = _cache_key(f"{raw_query}|{remote}", effective_loc, emp, page)
    cached = await _cache_get(cache_key)
    if cached is not None:
        return {**cached, "cached": True}

    # ── Provider cascade ──────────────────────────────────────────────────────
    try:
        result: dict | None = None

        if RAPIDAPI_KEY and effective_loc in _JSEARCH_LOC:
            try:
                result = await _search_jsearch(title, effective_loc, emp, page)
                if not result.get("jobs"):
                    result = None
            except Exception:
                result = None

        if result is None and ADZUNA_APP_ID and ADZUNA_APP_KEY:
            adzuna = await _search_adzuna(title, effective_loc, emp, page)
            if adzuna.get("source") != "unsupported":
                result = adzuna

        if result is None:
            if not RAPIDAPI_KEY and not (ADZUNA_APP_ID and ADZUNA_APP_KEY):
                return {
                    "jobs": [], "total": 0, "page": page, "source": "error",
                    "error": "No API credentials configured.",
                }
            return {"jobs": [], "total": 0, "page": page, "source": "no_results"}

        await _cache_set(cache_key, result)
        return {**result, "cached": False}

    except Exception as exc:
        return {"jobs": [], "total": 0, "page": page, "error": str(exc), "source": "error"}
