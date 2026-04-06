import enum
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database.db import Base


class ApplicationStatus(enum.Enum):
    APPLIED = "Applied"
    SHORTLISTED = "Shortlisted"
    HR_INTERVIEW = "HR Interview"
    TECH_INTERVIEW = "Tech Interview"
    OFFER = "Offer"
    REJECTED = "Rejected"


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    users = relationship("User", back_populates="organization")
    jobs = relationship("Job", back_populates="organization")


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
    person_profile = relationship("Person", back_populates="user", uselist=False)
    documents = relationship("Document", back_populates="owner")


class Person(Base):
    __tablename__ = "persons"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(String(64), ForeignKey("users.user_id"), nullable=False, unique=True)
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    phone = Column(String(64), nullable=True)
    city = Column(String(128), nullable=True)
    country = Column(String(128), nullable=True)
    profile_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="person_profile")
    resumes = relationship("Resume", back_populates="person")
    applications = relationship("Application", back_populates="person")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(String(64), unique=True, nullable=False, index=True)
    person_id = Column(String(64), ForeignKey("persons.person_id"), nullable=False)

    payload = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    person = relationship("Person", back_populates="resumes")
    applications = relationship("Application", back_populates="resume")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(64), unique=True, nullable=False, index=True)
    org_id = Column(String(64), ForeignKey("organizations.org_id"), nullable=False, index=True)
    owner_user_id = Column(String(64), ForeignKey("users.user_id"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)

    region = Column(String(64), nullable=True)
    screening_questions_json = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    organization = relationship("Organization", back_populates="jobs")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(String(64), unique=True, nullable=False, index=True)

    job_id = Column(String(64), ForeignKey("jobs.job_id"), nullable=False, index=True)
    person_id = Column(String(64), ForeignKey("persons.person_id"), nullable=False, index=True)
    resume_id = Column(String(64), ForeignKey("resumes.resume_id"), nullable=False, index=True)

    status = Column(Enum(ApplicationStatus), nullable=False, default=ApplicationStatus.APPLIED)
    answers_to_screening_json = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    job = relationship("Job", back_populates="applications")
    person = relationship("Person", back_populates="applications")
    resume = relationship("Resume", back_populates="applications")
    screening_result = relationship("ScreeningResult", back_populates="application", uselist=False, cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(String(64), unique=True, nullable=False, index=True)
    owner_user_id = Column(String(64), ForeignKey("users.user_id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(128), nullable=True)
    file_hash = Column(String(128), nullable=False, index=True)
    file_path = Column(String(512), nullable=True)
    raw_text = Column(Text, nullable=False)
    source_type = Column(String(32), nullable=False, default="uploaded_cv")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    owner = relationship("User", back_populates="documents")
    cv_improvements = relationship("CVImprovementResult", back_populates="document", cascade="all, delete-orphan")


class ScreeningResult(Base):
    __tablename__ = "screening_results"

    id = Column(Integer, primary_key=True, index=True)
    result_id = Column(String(64), unique=True, nullable=False, index=True)
    application_id = Column(String(64), ForeignKey("applications.application_id"), nullable=False, unique=True)

    score = Column(Integer, nullable=False)
    decision = Column(String(64), nullable=False)

    full_result_json = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    application = relationship("Application", back_populates="screening_result")


class CVImprovementResult(Base):

    __tablename__ = "cv_improvement_results"

    id = Column(Integer, primary_key=True, index=True)
    improvement_id = Column(String(64), unique=True, nullable=False, index=True)
    owner_user_id = Column(String(64), ForeignKey("users.user_id"), nullable=False, index=True)
    document_id = Column(String(64), ForeignKey("documents.document_id"), nullable=True, index=True)
    filename = Column(String(255), nullable=True)

    overall_score = Column(Integer, nullable=False)

    full_result_json = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    document = relationship("Document", back_populates="cv_improvements")