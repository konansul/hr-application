"""
Migration: Add valid_until and job_description columns to resumes table.
Run once: python -m backend.database.migrate_add_resume_fields
"""
from sqlalchemy import text
from backend.database.db import engine


def main():
    with engine.connect() as conn:
        # Add valid_until column (stores date as string e.g. "2026-12-31")
        try:
            conn.execute(text("ALTER TABLE resumes ADD COLUMN valid_until VARCHAR(20)"))
            print("Added column: valid_until")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("Column valid_until already exists, skipping.")
            else:
                raise

        # Add job_description column (stores full job description text)
        try:
            conn.execute(text("ALTER TABLE resumes ADD COLUMN job_description TEXT"))
            print("Added column: job_description")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("Column job_description already exists, skipping.")
            else:
                raise

        conn.commit()
    print("Migration complete.")


if __name__ == "__main__":
    main()