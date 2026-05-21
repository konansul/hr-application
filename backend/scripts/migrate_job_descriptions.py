"""
One-time migration: convert all job descriptions from raw markdown or
HTML-wrapped markdown (e.g. <p>## heading</p>) to proper HTML.
Run once, safe to run again (already-converted jobs are skipped).
"""

import re
import sys
from backend.database.db import SessionLocal
from backend.database.models import Job


# ── markdown parser (mirrors frontend utils/html.ts logic) ──────────────────

def inline_markdown(text: str) -> str:
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    text = re.sub(r'_(.+?)_', r'<em>\1</em>', text)
    text = re.sub(r'`(.+?)`', r'<code>\1</code>', text)
    return text


def parse_markdown(text: str) -> str:
    lines = text.split('\n')
    html = ''
    in_ul = False
    in_ol = False

    def close_list():
        nonlocal html, in_ul, in_ol
        if in_ul:
            html += '</ul>'
            in_ul = False
        if in_ol:
            html += '</ol>'
            in_ol = False

    for line in lines:
        m = re.match(r'^(#{1,6})\s+(.+)$', line)
        if m:
            close_list()
            level = len(m.group(1))
            label = inline_markdown(m.group(2))
            if level == 3 and not label.endswith(':'):
                label += ':'
            html += f'<h{level}>{label}</h{level}>'
            continue

        m = re.match(r'^[-*]\s+(.+)$', line)
        if m:
            if not in_ul:
                close_list()
                html += '<ul>'
                in_ul = True
            html += f'<li>{inline_markdown(m.group(1))}</li>'
            continue

        m = re.match(r'^\d+\.\s+(.+)$', line)
        if m:
            if not in_ol:
                close_list()
                html += '<ol>'
                in_ol = True
            html += f'<li>{inline_markdown(m.group(1))}</li>'
            continue

        if not line.strip():
            close_list()
            continue

        close_list()
        html += f'<p>{inline_markdown(line)}</p>'

    close_list()
    return html


def contains_embedded_markdown(html: str) -> bool:
    plain = re.sub(r'<[^>]+>', '\n', html)
    return bool(re.search(r'^#{1,6}\s|\*\*[\s\S]+?\*\*', plain, re.MULTILINE))


def convert(text: str) -> str | None:
    """Return converted HTML, or None if no conversion needed."""
    if not text:
        return None

    has_tags = bool(re.search(r'<[a-z][\s\S]*>', text, re.IGNORECASE))

    if has_tags:
        if not contains_embedded_markdown(text):
            return None  # Already proper HTML — skip
        # HTML wrapping raw markdown — strip tags then re-parse
        plain = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
        plain = re.sub(r'</p>', '\n', plain, flags=re.IGNORECASE)
        plain = re.sub(r'<[^>]+>', '', plain)
        plain = re.sub(r'\n{3,}', '\n\n', plain).strip()
        return parse_markdown(plain)

    # Raw markdown (no HTML tags at all)
    return parse_markdown(text)


# ── main ────────────────────────────────────────────────────────────────────

def main():
    db = SessionLocal()
    try:
        jobs = db.query(Job).all()
        updated = 0
        skipped = 0

        for job in jobs:
            result = convert(job.description or '')
            if result is None:
                skipped += 1
                continue
            job.description = result
            updated += 1
            print(f'  OK [{job.id}] {job.title[:60]}')

        db.commit()
        print(f'\nDone — {updated} job(s) converted, {skipped} skipped (already proper HTML).')
    except Exception as e:
        db.rollback()
        print(f'ERROR: {e}', file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == '__main__':
    main()
