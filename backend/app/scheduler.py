from __future__ import annotations

import asyncio
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import resend
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.database.db import SessionLocal
from backend.database.models import Person, User

logger = logging.getLogger(__name__)

WARN_AFTER_DAYS = 180
DELETE_AFTER_WARN_DAYS = 14


async def run_inactivity_loop() -> None:
    """Daily background task: warn inactive users, delete/anonymize stale ones."""
    await asyncio.sleep(60)  # brief startup delay
    while True:
        try:
            await asyncio.to_thread(_run_inactivity_check)
        except Exception:
            logger.exception("Inactivity check failed")
        await asyncio.sleep(24 * 3600)


def _run_inactivity_check() -> None:
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        warn_cutoff = now - timedelta(days=WARN_AFTER_DAYS)
        delete_cutoff = now - timedelta(days=DELETE_AFTER_WARN_DAYS)

        _send_warnings(db, now, warn_cutoff)
        _delete_stale(db, delete_cutoff)
    finally:
        db.close()


def _send_warnings(db: Session, now: datetime, warn_cutoff: datetime) -> None:
    users = (
        db.query(User)
        .filter(
            User.is_active == True,
            User.inactivity_warning_sent_at == None,
            or_(
                and_(User.last_active_at != None, User.last_active_at < warn_cutoff),
                and_(User.last_active_at == None, User.created_at < warn_cutoff),
            ),
        )
        .all()
    )

    for user in users:
        token = secrets.token_urlsafe(32)
        user.reactivation_token = token
        user.inactivity_warning_sent_at = now
        try:
            db.flush()
            _send_warning_email(db, user, DELETE_AFTER_WARN_DAYS)
            db.commit()
            logger.info("Inactivity warning sent to user %s", user.user_id)
        except Exception:
            db.rollback()
            logger.exception("Failed to send warning to user %s", user.user_id)


def _delete_stale(db: Session, delete_cutoff: datetime) -> None:
    users = (
        db.query(User)
        .filter(
            User.is_active == True,
            User.inactivity_warning_sent_at != None,
            User.inactivity_warning_sent_at < delete_cutoff,
        )
        .all()
    )

    for user in users:
        try:
            _anonymize_user(db, user)
            db.commit()
            logger.info("Anonymized inactive user %s", user.user_id)
        except Exception:
            db.rollback()
            logger.exception("Failed to anonymize user %s", user.user_id)


def _anonymize_user(db: Session, user: User) -> None:
    ghost_id = uuid.uuid4().hex
    user.email = f"deleted_{ghost_id}@deleted.invalid"
    user.password_hash = secrets.token_hex(64)
    user.is_active = False
    user.reactivation_token = None
    user.inactivity_warning_sent_at = None

    person: Person | None = (
        db.query(Person).filter(Person.user_id == user.user_id).first()
    )
    if person:
        person.first_name = "Deleted"
        person.last_name = "User"
        person.phone = None
        person.city = None
        person.country = None
        person.profile_json = None
        person.public_url_slug = None


def _send_warning_email(db: Session, user: User, days_remaining: int) -> None:
    if not settings.EMAIL_API_KEY:
        logger.warning("EMAIL_API_KEY not set — skipping inactivity warning email")
        return

    person: Person | None = (
        db.query(Person).filter(Person.user_id == user.user_id).first()
    )
    first_name = person.first_name if person and person.first_name else "there"

    reactivate_url = (
        f"{settings.BACKEND_URL}/v1/auth/reactivate?token={user.reactivation_token}"
    )

    delete_date = (
        datetime.now(timezone.utc) + timedelta(days=days_remaining)
    ).strftime("%B %d, %Y")

    html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f4f4f5; margin:0; padding:0; }}
    .wrap {{ max-width:560px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.08); }}
    .header {{ background:linear-gradient(135deg,#0ea5e9,#3b82f6); padding:32px 40px; color:#fff; }}
    .header h1 {{ margin:0; font-size:22px; font-weight:700; }}
    .header p {{ margin:6px 0 0; opacity:.85; font-size:14px; }}
    .body {{ padding:32px 40px; color:#374151; }}
    .days-badge {{ display:inline-block; background:#fee2e2; color:#dc2626; font-size:28px; font-weight:800; padding:10px 22px; border-radius:8px; margin:16px 0; }}
    .btn {{ display:inline-block; margin-top:24px; padding:14px 32px; background:linear-gradient(135deg,#0ea5e9,#3b82f6); color:#fff!important; text-decoration:none; border-radius:8px; font-weight:600; font-size:15px; }}
    .footer {{ padding:20px 40px; font-size:12px; color:#9ca3af; border-top:1px solid #f3f4f6; }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Account inactivity notice</h1>
      <p>Action required to keep your HRAI account</p>
    </div>
    <div class="body">
      <p>Hi <strong>{first_name}</strong>,</p>
      <p>We noticed you haven't logged into your HRAI account for over 6 months.</p>
      <p>Your account will be permanently deleted in:</p>
      <div class="days-badge">{days_remaining} days</div>
      <p style="color:#6b7280;font-size:14px;">Scheduled deletion date: <strong>{delete_date}</strong></p>
      <p>To keep your account active, simply click the button below:</p>
      <a href="{reactivate_url}" class="btn">Keep My Account</a>
      <p style="margin-top:24px;font-size:13px;color:#9ca3af;">
        If you no longer need your account, you can ignore this email and it will be automatically removed on {delete_date}.
      </p>
    </div>
    <div class="footer">
      You're receiving this because you have an account at HRAI. This is an automated message.
    </div>
  </div>
</body>
</html>
"""

    resend.api_key = settings.EMAIL_API_KEY
    resend.Emails.send(
        {
            "from": f"HRAI <{settings.EMAIL_FROM}>",
            "to": [user.email],
            "subject": f"Your HRAI account will be deleted in {days_remaining} days",
            "html": html,
        }
    )
