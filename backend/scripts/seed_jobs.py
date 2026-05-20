"""
Seed script — inserts 1000 realistic platform jobs for the demo HR account.
Run from the project root:
    venv/Scripts/python.exe -m backend.scripts.seed_jobs
"""
from __future__ import annotations

import json
import random
import uuid
from datetime import datetime, timezone

from backend.database.db import SessionLocal
from backend.database.models import Job

# ── target HR account ────────────────────────────────────────────────────────
HR_USER_ID = "usr_56c3ca62035a"
ORG_ID     = "org_08498499005e"

DEFAULT_STAGES = ["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFER", "REJECTED"]

# ── data pools ───────────────────────────────────────────────────────────────
TITLES = [
    "Software Engineer", "Senior Software Engineer", "Staff Engineer",
    "Frontend Developer", "Backend Developer", "Full-Stack Developer",
    "DevOps Engineer", "Site Reliability Engineer", "Platform Engineer",
    "Data Engineer", "Data Scientist", "Machine Learning Engineer",
    "AI Research Engineer", "MLOps Engineer",
    "Product Manager", "Senior Product Manager", "Principal Product Manager",
    "UX Designer", "Product Designer", "UI Designer",
    "QA Engineer", "Automation Engineer", "SDET",
    "Security Engineer", "Cloud Architect", "Solutions Architect",
    "Android Developer", "iOS Developer", "Mobile Engineer",
    "Technical Lead", "Engineering Manager", "VP of Engineering",
    "Data Analyst", "Business Analyst", "BI Developer",
    "Scrum Master", "Agile Coach", "Project Manager",
    "Technical Writer", "Developer Advocate", "Sales Engineer",
    "HR Manager", "Talent Acquisition Specialist", "Recruiter",
    "Finance Analyst", "Accountant", "Operations Manager",
    "Marketing Manager", "Content Strategist", "SEO Specialist",
    "Customer Success Manager", "Support Engineer",
]

LEVELS = ["Junior", "Mid", "Senior", "Lead", "Staff", "Principal", "Manager", "Director"]

REGIONS = [
    "Remote", "United States", "United Kingdom", "Germany", "France",
    "Netherlands", "Canada", "Australia", "Spain", "Poland",
    "Sweden", "Ireland", "Singapore", "India", "Brazil",
]

TECH_STACKS = [
    ["Python", "FastAPI", "PostgreSQL", "Docker"],
    ["React", "TypeScript", "Node.js", "GraphQL"],
    ["Go", "Kubernetes", "gRPC", "Terraform"],
    ["Java", "Spring Boot", "Kafka", "MySQL"],
    ["Rust", "WebAssembly", "Linux", "CI/CD"],
    ["Swift", "SwiftUI", "Xcode", "Core Data"],
    ["Kotlin", "Jetpack Compose", "Android SDK", "Firebase"],
    ["C#", ".NET", "Azure", "SQL Server"],
    ["Ruby", "Rails", "Redis", "Sidekiq"],
    ["Scala", "Spark", "Hadoop", "Airflow"],
    ["Vue.js", "Nuxt", "Tailwind CSS", "Vite"],
    ["Flutter", "Dart", "Firebase", "REST APIs"],
    ["TensorFlow", "PyTorch", "MLflow", "Jupyter"],
    ["Ansible", "Terraform", "Prometheus", "Grafana"],
    ["Figma", "Storybook", "Design Systems", "Accessibility"],
]

PERKS = [
    "Flexible remote work", "Competitive salary + equity",
    "30 days PTO", "Home office stipend", "Health & dental insurance",
    "Learning & development budget", "Annual company retreats",
    "Parental leave", "Mental health support", "4-day work week option",
]

def make_description(title: str, level: str, region: str, stack: list[str]) -> str:
    perks_sample = random.sample(PERKS, 3)
    return (
        f"## {level} {title}\n\n"
        f"**Location:** {region}  \n"
        f"**Level:** {level}\n\n"
        f"### About the role\n"
        f"We are looking for a talented {level} {title} to join our growing team. "
        f"You will work on challenging problems, collaborate with world-class engineers, "
        f"and have a direct impact on our product.\n\n"
        f"### What you'll do\n"
        f"- Design and implement scalable solutions using {stack[0]} and {stack[1]}\n"
        f"- Collaborate closely with product and design to ship high-quality features\n"
        f"- Participate in code reviews and contribute to engineering best practices\n"
        f"- Help grow and mentor junior members of the team\n\n"
        f"### Requirements\n"
        f"- 2+ years of hands-on experience with {stack[0]}\n"
        f"- Strong understanding of {stack[1]} and {stack[2]}\n"
        f"- Experience with {stack[3]} in production environments\n"
        f"- Excellent communication skills and a team-first mindset\n\n"
        f"### Nice to have\n"
        f"- Experience working in a fast-paced startup environment\n"
        f"- Open-source contributions\n\n"
        f"### Benefits\n"
        + "\n".join(f"- {p}" for p in perks_sample)
    )

def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

def seed(n: int = 1000) -> None:
    db = SessionLocal()
    try:
        existing = db.query(Job).filter(Job.owner_user_id == HR_USER_ID).count()
        if existing >= n:
            print(f"Already {existing} jobs — nothing to do.")
            return

        to_create = n - existing
        print(f"Creating {to_create} jobs (existing: {existing})…")

        jobs = []
        for i in range(to_create):
            title  = random.choice(TITLES)
            level  = random.choice(LEVELS)
            region = random.choice(REGIONS)
            stack  = random.choice(TECH_STACKS)

            jobs.append(Job(
                job_id=new_id("job"),
                org_id=ORG_ID,
                owner_user_id=HR_USER_ID,
                title=f"{level} {title}",
                description=make_description(title, level, region, stack),
                level=level,
                region=region,
                status="active",
                screening_questions_json=json.dumps([]),
                pipeline_stages_json=json.dumps(DEFAULT_STAGES),
                requirements=None,
            ))

            if len(jobs) % 100 == 0:
                db.bulk_save_objects(jobs)
                db.flush()
                jobs = []
                print(f"  …{i + 1} inserted")

        if jobs:
            db.bulk_save_objects(jobs)

        db.commit()
        total = db.query(Job).filter(Job.owner_user_id == HR_USER_ID).count()
        print(f"Done. Total platform jobs: {total}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
