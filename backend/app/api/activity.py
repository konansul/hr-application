from __future__ import annotations

from datetime import datetime, timedelta, timezone, date as date_type
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.database.models import UserActivityLog, User, Person
from backend.database.storage import new_id
from backend.app.api.helpers.ownership import get_current_user

router = APIRouter()


class ActivityLogRequest(BaseModel):
    module: str


@router.post("/activity")
def log_activity(
    body: ActivityLogRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = UserActivityLog(
        log_id=new_id("act"),
        user_id=current_user.user_id,
        module=body.module,
        role=current_user.role,
    )
    db.add(entry)
    db.commit()
    return {"ok": True}


@router.get("/admin/analytics")
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_teammate:
        raise HTTPException(status_code=403, detail="Forbidden")

    users = db.query(User).order_by(User.created_at.desc()).all()

    # Fetch all persons for name lookup
    persons = db.query(Person).all()
    person_by_user: dict[str, Person] = {p.user_id: p for p in persons}

    # Fetch all activity logs
    logs = db.query(UserActivityLog).order_by(UserActivityLog.logged_at.desc()).all()

    # Build per-user module counts
    user_module_counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    user_last_seen: dict[str, datetime] = {}
    for log in logs:
        user_module_counts[log.user_id][log.module] += 1
        if log.user_id not in user_last_seen:
            user_last_seen[log.user_id] = log.logged_at

    # Module totals across all users
    module_totals: dict[str, int] = defaultdict(int)
    for uid, counts in user_module_counts.items():
        for mod, cnt in counts.items():
            module_totals[mod] += cnt

    # Active counts
    now = datetime.now(timezone.utc)
    active_7d = set()
    active_30d = set()
    for log in logs:
        ts = log.logged_at
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        if (now - ts) <= timedelta(days=7):
            active_7d.add(log.user_id)
        if (now - ts) <= timedelta(days=30):
            active_30d.add(log.user_id)

    user_list = []
    for u in users:
        p = person_by_user.get(u.user_id)
        last_seen = user_last_seen.get(u.user_id)
        # Fall back to last_active_at from users table if no activity logs yet
        if last_seen is None and u.last_active_at:
            last_seen = u.last_active_at
        user_list.append({
            "user_id": u.user_id,
            "email": u.email,
            "first_name": p.first_name if p else None,
            "last_name": p.last_name if p else None,
            "role": u.role,
            "is_teammate": u.is_teammate,
            "joined_at": u.created_at.isoformat() if u.created_at else None,
            "last_seen": last_seen.isoformat() if last_seen else None,
            "ai_used": u.ai_used,
            "ai_quota": u.ai_quota,
            "module_counts": dict(user_module_counts.get(u.user_id, {})),
        })

    hr_count = sum(1 for u in users if u.role == "hr")
    candidate_count = sum(1 for u in users if u.role == "candidate")

    return {
        "total_users": len(users),
        "hr_count": hr_count,
        "candidate_count": candidate_count,
        "active_last_7_days": len(active_7d),
        "active_last_30_days": len(active_30d),
        "module_totals": dict(module_totals),
        "users": user_list,
    }


@router.get("/admin/analytics/timeline")
def get_timeline(
    days: int = Query(default=30, ge=7, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_teammate:
        raise HTTPException(status_code=403, detail="Forbidden")

    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    logs = (
        db.query(UserActivityLog)
        .filter(UserActivityLog.logged_at >= since)
        .all()
    )

    # Group by date
    day_users: dict[str, set[str]] = defaultdict(set)
    day_hr_users: dict[str, set[str]] = defaultdict(set)
    day_candidate_users: dict[str, set[str]] = defaultdict(set)
    day_events: dict[str, int] = defaultdict(int)

    for log in logs:
        ts = log.logged_at
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        day = ts.strftime("%Y-%m-%d")
        day_users[day].add(log.user_id)
        day_events[day] += 1
        if log.role == "hr":
            day_hr_users[day].add(log.user_id)
        else:
            day_candidate_users[day].add(log.user_id)

    # Build a full range of dates (fill in zeros for days with no activity)
    result = []
    for i in range(days):
        d = (now - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        result.append({
            "date": d,
            "unique_users": len(day_users.get(d, set())),
            "hr_users": len(day_hr_users.get(d, set())),
            "candidate_users": len(day_candidate_users.get(d, set())),
            "total_events": day_events.get(d, 0),
        })

    return {"days": result, "range_days": days}


@router.get("/admin/analytics/events")
def get_events(
    days: int = Query(default=30, ge=0, le=365),
    role: str = Query(default="all"),
    module: str = Query(default="all"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_teammate:
        raise HTTPException(status_code=403, detail="Forbidden")

    query = db.query(UserActivityLog)

    if days > 0:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.filter(UserActivityLog.logged_at >= since)

    if role != "all":
        query = query.filter(UserActivityLog.role == role)

    if module != "all":
        query = query.filter(UserActivityLog.module == module)

    total = query.count()
    logs = (
        query
        .order_by(UserActivityLog.logged_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    # Fetch user info for display
    user_ids = list({log.user_id for log in logs})
    users_map: dict[str, User] = {u.user_id: u for u in db.query(User).filter(User.user_id.in_(user_ids)).all()}
    persons_map: dict[str, Person] = {p.user_id: p for p in db.query(Person).filter(Person.user_id.in_(user_ids)).all()}

    # Distinct modules for filter options
    all_modules = [
        row[0] for row in
        db.query(UserActivityLog.module).distinct().order_by(UserActivityLog.module).all()
    ]

    events = []
    for log in logs:
        u = users_map.get(log.user_id)
        p = persons_map.get(log.user_id)
        ts = log.logged_at
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        events.append({
            "log_id": log.log_id,
            "user_id": log.user_id,
            "email": u.email if u else "—",
            "first_name": p.first_name if p else None,
            "last_name": p.last_name if p else None,
            "module": log.module,
            "role": log.role,
            "logged_at": ts.isoformat(),
        })

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, (total + per_page - 1) // per_page),
        "events": events,
        "all_modules": all_modules,
    }
