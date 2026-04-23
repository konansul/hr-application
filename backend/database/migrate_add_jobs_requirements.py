"""
Migration: Add requirements column to jobs table.
Run once: python -m backend.database.migrate_add_jobs_requirements
"""
from sqlalchemy import text
from backend.database.db import engine


def main():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN requirements JSONB"))
            print("Added column: requirements")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("Column requirements already exists, skipping.")
            else:
                raise

        conn.commit()
    print("Migration complete.")


if __name__ == "__main__":
    main()
