from __future__ import annotations

import os
import httpx
from fastapi import APIRouter, Query

router = APIRouter()

ADZUNA_APP_ID  = os.getenv("ADZUNA_APP_ID", "")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "")
RAPIDAPI_KEY   = os.getenv("RAPIDAPI_KEY", "")

# ---------------------------------------------------------------------------
# Adzuna — native country endpoints
# Maps frontend location value → (adzuna_country_code, city_for_where_filter)
# where= works only for cities within that endpoint's own country.
# ---------------------------------------------------------------------------
_ADZUNA_LOC: dict[str, tuple[str, str]] = {
    "remote":      ("gb", ""),
    "usa":         ("us", ""),
    "uk":          ("gb", ""),
    "canada":      ("ca", ""),
    "germany":     ("de", ""),
    "france":      ("fr", ""),
    "netherlands": ("nl", ""),
    "poland":      ("pl", ""),
    "spain":       ("es", ""),
    "italy":       ("it", ""),
    "switzerland": ("ch", ""),
    "austria":     ("at", ""),
    "belgium":     ("be", ""),
    "australia":   ("au", ""),
    "singapore":   ("sg", ""),
    "india":       ("in", ""),
    "brazil":      ("br", ""),
    "mexico":      ("mx", ""),
    # UK cities — where= works on the GB endpoint
    "london":      ("gb", "London"),
    "manchester":  ("gb", "Manchester"),
    "birmingham":  ("gb", "Birmingham"),
    "edinburgh":   ("gb", "Edinburgh"),
    "bristol":     ("gb", "Bristol"),
    # US cities — where= works on the US endpoint
    "new-york":    ("us", "New York"),
    "sf-bay":      ("us", "San Francisco"),
    "los-angeles": ("us", "Los Angeles"),
    "seattle":     ("us", "Seattle"),
    "austin":      ("us", "Austin"),
    "boston":      ("us", "Boston"),
    "chicago":     ("us", "Chicago"),
    "denver":      ("us", "Denver"),
    "miami":       ("us", "Miami"),
    "dc":          ("us", "Washington"),
    # Canada cities — where= works on the CA endpoint
    "toronto":     ("ca", "Toronto"),
    "vancouver":   ("ca", "Vancouver"),
    "montreal":    ("ca", "Montreal"),
}

# ---------------------------------------------------------------------------
# JSearch (RapidAPI / Google Jobs) — covers locations Adzuna doesn't have
# Tuple: (city for location= param, words to strip from query, ISO country code)
# The country= param is critical — without it JSearch defaults to "us".
# "europe" is left to Adzuna since there is no single EU country code.
# ---------------------------------------------------------------------------
_JSEARCH_LOC: dict[str, tuple[str, str, str]] = {
    "portugal":  ("Lisbon",      "lisbon porto portugal",  "pt"),
    "sweden":    ("Stockholm",   "stockholm sweden",       "se"),
    "norway":    ("Oslo",        "oslo norway",            "no"),
    "denmark":   ("Copenhagen",  "copenhagen denmark",     "dk"),
    "finland":   ("Helsinki",    "helsinki finland",       "fi"),
    "ireland":   ("Dublin",      "dublin ireland",         "ie"),
    "czech":     ("Prague",      "prague brno czech",      "cz"),
    "ukraine":   ("Kyiv",        "kyiv ukraine",           "ua"),
    "romania":   ("Bucharest",   "bucharest romania",      "ro"),
    "greece":    ("Athens",      "athens greece",          "gr"),
    "hungary":   ("Budapest",    "budapest hungary",       "hu"),
    "latvia":    ("Riga",        "riga latvia",            "lv"),
    "lithuania": ("Vilnius",     "vilnius lithuania",      "lt"),
    "estonia":   ("Tallinn",     "tallinn estonia",        "ee"),
    "croatia":   ("Zagreb",      "zagreb croatia",         "hr"),
    "uae":       ("Dubai",       "dubai abu dhabi uae",    "ae"),
    "israel":    ("Tel Aviv",    "tel aviv israel",        "il"),
    "japan":     ("Tokyo",       "tokyo osaka japan",      "jp"),
}

_LOCATION_STOP_WORDS = {
    "in", "at", "near", "from", "for", "to", "based", "job", "jobs",
    "work", "working", "position", "role", "opportunity", "opportunities",
    "remote", "hybrid", "onsite", "on-site",
}


def _strip_location_words(query: str, location_words: str) -> str:
    """Remove location words and stop-words from query so they don't pollute what=."""
    loc_set = set(location_words.lower().split())
    cleaned = [
        w for w in query.split()
        if w.lower() not in loc_set and w.lower() not in _LOCATION_STOP_WORDS
    ]
    return " ".join(cleaned)


# ---------------------------------------------------------------------------
# Adzuna search — for all locations it natively supports
# ---------------------------------------------------------------------------
async def _search_adzuna(query: str, location_value: str, employment_type: str, page: int) -> dict:
    country, where = _ADZUNA_LOC.get(location_value, ("gb", ""))

    params: dict = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "results_per_page": 20,
        "content-type": "application/json",
    }

    effective_query = query
    if employment_type == "remote":
        effective_query = f"remote {effective_query}".strip()
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

    jobs = []
    for item in data.get("results", []):
        jobs.append({
            "job_id":        f"adzuna_{item.get('id', '')}",
            "title":         item.get("title", ""),
            "description":   item.get("description", ""),
            "company":       item.get("company", {}).get("display_name", ""),
            "location":      item.get("location", {}).get("display_name", ""),
            "salary_min":    item.get("salary_min"),
            "salary_max":    item.get("salary_max"),
            "url":           item.get("redirect_url", ""),
            "created_at":    item.get("created", ""),
            "contract_time": item.get("contract_time", ""),
            "tags":          [],
            "remote":        False,
            "source":        "adzuna",
        })
    return {"jobs": jobs, "total": data.get("count", 0), "page": page, "source": "adzuna"}


# ---------------------------------------------------------------------------
# JSearch search — Google Jobs aggregator via RapidAPI
# Free tier: 200 requests/month. Sign up at rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
# ---------------------------------------------------------------------------
async def _search_jsearch(query: str, location_value: str, employment_type: str, page: int) -> dict:
    loc_entry = _JSEARCH_LOC.get(location_value, (location_value, "", ""))
    location_str, strip_words, country_iso = loc_entry

    clean_query = _strip_location_words(query, strip_words)
    job_query = clean_query if clean_query else "jobs"

    params: dict = {
        "query":     job_query,
        "location":  location_str,
        "page":      str(page),
        "num_pages": "1",
    }
    if country_iso:
        params["country"] = country_iso   # required — without this JSearch defaults to "us"

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

    url = "https://jsearch.p.rapidapi.com/search"
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(url, params=params, headers=headers)
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
            "description":   (item.get("job_description", "") or "")[:500],
            "company":       item.get("employer_name", ""),
            "location":      loc_str,
            "salary_min":    item.get("job_min_salary"),
            "salary_max":    item.get("job_max_salary"),
            "url":           item.get("job_apply_link", ""),
            "created_at":    item.get("job_posted_at_datetime_utc", ""),
            "contract_time": item.get("job_employment_type", ""),
            "tags":          [],
            "remote":        bool(item.get("job_is_remote", False)),
            "source":        "jsearch",
        })

    # JSearch doesn't return a total count — estimate based on pages
    estimated_total = len(jobs) * 10 if jobs else 0
    return {"jobs": jobs, "total": estimated_total, "page": page, "source": "jsearch"}


# Reverse map: keyword in free-text query → location value
# Auto-detects location when user types city name without selecting from dropdown.
_QUERY_TO_LOC: dict[str, str] = {
    "lisbon": "portugal", "porto": "portugal", "portugal": "portugal",
    "dubai": "uae", "abu dhabi": "uae", "uae": "uae",
    "stockholm": "sweden", "sweden": "sweden",
    "oslo": "norway", "norway": "norway",
    "copenhagen": "denmark", "denmark": "denmark",
    "helsinki": "finland", "finland": "finland",
    "dublin": "ireland", "ireland": "ireland",
    "prague": "czech", "brno": "czech",
    "kyiv": "ukraine", "ukraine": "ukraine",
    "bucharest": "romania", "romania": "romania",
    "athens": "greece", "greece": "greece",
    "budapest": "hungary", "hungary": "hungary",
    "riga": "latvia", "latvia": "latvia",
    "vilnius": "lithuania", "lithuania": "lithuania",
    "tallinn": "estonia", "estonia": "estonia",
    "zagreb": "croatia", "croatia": "croatia",
    "tel aviv": "israel", "israel": "israel",
    "tokyo": "japan", "osaka": "japan", "japan": "japan",
}


@router.get("/api/external-jobs/debug-jsearch")
async def debug_jsearch(q: str = Query("developer"), loc: str = Query("portugal")):
    """Dev-only endpoint — returns raw JSearch response for diagnosis."""
    if not RAPIDAPI_KEY:
        return {"error": "RAPIDAPI_KEY not set"}
    loc_entry = _JSEARCH_LOC.get(loc, (loc, "", ""))
    location_str, strip_words, country_iso = loc_entry
    clean_query = _strip_location_words(q, strip_words) or "jobs"
    params: dict = {"query": clean_query, "location": location_str, "page": "1", "num_pages": "1"}
    if country_iso:
        params["country"] = country_iso
    headers = {"X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": "jsearch.p.rapidapi.com"}
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get("https://jsearch.p.rapidapi.com/search", params=params, headers=headers)
    return {"status": r.status_code, "params_sent": params, "body": r.json() if r.is_success else r.text[:500]}


@router.get("/api/external-jobs/search")
async def search_external_jobs(
    q: str = Query(""),
    location_value: str = Query("all"),
    employment_type: str = Query(""),
    level: str = Query(""),
    page: int = Query(1, ge=1),
):
    query = f"{level} {q}".strip() if level and level not in ("all", "") else q
    emp   = "" if employment_type in ("all", "") else employment_type
    loc   = "" if location_value  in ("all", "") else location_value

    # Auto-detect location from query text when no dropdown selection is active.
    if not loc and query:
        q_lower = query.lower()
        for keyword, detected_loc in _QUERY_TO_LOC.items():
            if keyword in q_lower:
                loc = detected_loc
                break

    try:
        # Route to JSearch when the location has no native Adzuna endpoint and
        # a RapidAPI key is available. JSearch uses Google Jobs data and covers
        # Portugal, UAE, and all other non-Adzuna markets accurately.
        if RAPIDAPI_KEY and loc in _JSEARCH_LOC:
            return await _search_jsearch(query, loc, emp, page)

        if ADZUNA_APP_ID and ADZUNA_APP_KEY:
            return await _search_adzuna(query, loc, emp, page)

        return {
            "jobs": [], "total": 0, "page": page, "source": "error",
            "error": "No API credentials configured. Set ADZUNA_APP_ID/ADZUNA_APP_KEY or RAPIDAPI_KEY.",
        }
    except Exception as exc:
        return {"jobs": [], "total": 0, "page": page, "error": str(exc), "source": "error"}
