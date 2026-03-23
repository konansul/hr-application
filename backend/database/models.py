from __future__ import annotations

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, Column
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from backend.database.db import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    users = relationship("User", back_populates="organization")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), unique=True, nullable=False, index=True)
    org_id = Column(String(64), ForeignKey("organizations.org_id"), nullable=True, index=True)

    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="candidate")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    organization = relationship("Organization", back_populates="users")
    jobs = relationship("Job", back_populates="owner")
    documents = relationship("Document", back_populates="owner")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(64), unique=True, nullable=False, index=True)
    owner_user_id = Column(String(64), ForeignKey("users.user_id"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    owner = relationship("User", back_populates="jobs")
    screening_results = relationship("ScreeningResult", back_populates="job")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(String(64), unique=True, nullable=False, index=True)
    owner_user_id = Column(String(64), ForeignKey("users.user_id"), nullable=False, index=True)

    filename = Column(String(255), nullable=False)
    content_type = Column(String(128), nullable=True)
    file_hash = Column(String(128), nullable=False, index=True)
    raw_text = Column(Text, nullable=False)
    source_type = Column(String(32), nullable=False, default="screen_cv")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    owner = relationship("User", back_populates="documents")
    screening_results = relationship("ScreeningResult", back_populates="document")
    cv_improvements = relationship("CVImprovementResult", back_populates="document")


class ScreeningResult(Base):
    __tablename__ = "screening_results"

    id = Column(Integer, primary_key=True, index=True)
    result_id = Column(String(64), unique=True, nullable=False, index=True)

    owner_user_id = Column(String(64), ForeignKey("users.user_id"), nullable=False, index=True)
    job_id = Column(String(64), ForeignKey("jobs.job_id"), nullable=True, index=True)
    document_id = Column(String(64), ForeignKey("documents.document_id"), nullable=True, index=True)

    filename = Column(String(255), nullable=True)
    candidate_name = Column(String(255), nullable=True)

    score = Column(Integer, nullable=False)
    decision = Column(String(64), nullable=False)
    status = Column(String(32), nullable=False, default="New", index=True)
    summary = Column(Text, nullable=True)

    matched_skills_json = Column(Text, nullable=True)
    missing_skills_json = Column(Text, nullable=True)
    risks_json = Column(Text, nullable=True)
    full_result_json = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    job = relationship("Job", back_populates="screening_results")
    document = relationship("Document", back_populates="screening_results")


class CVImprovementResult(Base):
    __tablename__ = "cv_improvement_results"

    id = Column(Integer, primary_key=True, index=True)
    improvement_id = Column(String(64), unique=True, nullable=False, index=True)

    owner_user_id = Column(String(64), ForeignKey("users.user_id"), nullable=False, index=True)
    document_id = Column(String(64), ForeignKey("documents.document_id"), nullable=True, index=True)

    filename = Column(String(255), nullable=True)
    overall_score = Column(Integer, nullable=False)
    summary = Column(Text, nullable=True)

    strengths_json = Column(Text, nullable=True)
    weaknesses_json = Column(Text, nullable=True)
    missing_keywords_json = Column(Text, nullable=True)
    improvements_json = Column(Text, nullable=True)
    improved_summary = Column(Text, nullable=True)
    rewritten_bullets_json = Column(Text, nullable=True)
    full_result_json = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    document = relationship("Document", back_populates="cv_improvements")