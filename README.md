# AI-Powered HR Recruitment and CV Screening Platform

This product is a full-stack recruitment automation platform that streamlines the end-to-end hiring workflow for HR teams and job candidates. The system enables HR managers to post jobs with structured screening criteria, bulk-upload and AI-parse candidate resumes, and automatically score each applicant against a job description using a large language model. Candidates interact through a dedicated portal where they can build a master profile, upload their CV, apply to open positions, and answer screening questions. On the HR side, the platform provides an AI screening pipeline (single and bulk), a structured Kanban recruitment board, side-by-side candidate comparison, and a full screening history log. Job descriptions can be enriched by an AI refinement engine that injects region-specific legal clauses (EEO, GDPR, pay transparency, visa sponsorship). A separate CV improvement module lets candidates receive AI-scored feedback, keyword gap analysis, and rewritten bullet points for their resumes.

The backend is built with FastAPI and PostgreSQL for durable, multi-tenant storage of organizations, users, jobs, applications, and AI results. The React/TypeScript frontend is served as a Vite SPA and communicates exclusively through REST APIs, with Zustand managing shared application state across role-specific dashboards. 

The application is deployed in Azure: https://happy-hill-018c19800.4.azurestaticapps.net

---

## Requirements

- Docker, Docker Compose
- Python 3.10+
- Node.js 18+

Core backend dependencies include:

```
fastapi
uvicorn
sqlalchemy
psycopg2-binary
pydantic
python-jose
passlib
bcrypt
pypdf
python-docx
openai
python-dotenv
```

Frontend dependencies include:

```
react 18
typescript
vite
tailwindcss
axios
zustand
```

All Python dependencies are listed in `requirements.txt`. All frontend dependencies are listed in `frontend/package.json`.

---

## Setup

### 1. Clone or download the repository

### 2. Start PostgreSQL through Docker

PostgreSQL is started via Docker Compose and will be available at port `5432`.

```bash
docker compose up -d
```

### 3. Create and configure environment variables

This project uses environment variables for database connection, authentication, and LLM API access. Create a `.env` file in the project root directory (the same level as `README.md`):

```bash
touch .env
```

Add the following variables to the `.env` file. `OPENROUTER_API_KEY` is required for all AI features (CV screening, parsing, improvement, and job refinement).

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
GEMINI_MODEL=google/gemini-2.5-pro

DATABASE_URL=your_database_url

SECRET_KEY=your_sekret_key
JWT_ALGORITHM=your_jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES=180
```

### 4. Create a virtual environment and install requirements

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 5. Initialize the database

Run the table creation script once before starting the server for the first time:

```bash
python backend/database/create_tables.py
```

### 6. Start the backend API server

The backend will be available at `http://127.0.0.1:8000`. Interactive Swagger documentation is available at `http://127.0.0.1:8000/docs`.

```bash
uvicorn backend.app.main:app --reload --port 8000
```

### 7. Start the React frontend

In a separate terminal, install dependencies and start the Vite development server. The frontend will be available at `http://localhost:5173`.

```bash
cd frontend
npm install
npm run dev
```

---

## Database Schema

The backend uses a PostgreSQL database to persist organizations, users, job postings, candidate profiles, resumes, applications, and AI-generated screening results. Each HR user belongs to an organization, and all jobs, applications, and screening records are scoped to that organization, enabling full multi-tenancy isolation between companies.

Users are separated into two roles — `hr` and `candidate` — each with a corresponding profile record in the `persons` table. For candidates, the person profile stores structured personal information (name, location, contact details) as well as a `profile_json` column containing the full parsed CV data: work experience, education, skills, languages, and certifications. For HR users, the same `profile_json` column stores recruiter-specific metadata (bio, department, role title, timezone, LinkedIn URL) under a dedicated `hr_profile` key.

Uploaded CV files are stored as `documents`, which retain the original raw text and a `file_path` pointer to the binary file on disk (for PDF viewing). Each document is associated with its uploader via `owner_user_id`. When a CV is uploaded, the AI parser runs automatically and the extracted structured data is stored as a `resume` record linked to the candidate's `person` profile.

Jobs are created by HR users and belong to their organization. Each job can contain a `screening_questions_json` field with a list of custom questions that candidates must answer when applying. Applications link a candidate (`person`) to a job and a specific resume snapshot, carry a status field following the recruitment funnel (`Applied → Shortlisted → HR Interview → Tech Interview → Offer → Rejected`), and may contain an `answers_to_screening_json` field with the candidate's responses to screening questions.

Each application can have at most one `screening_result`, which stores the AI-generated score (0–100), decision, and full JSON output (summary, matched skills, missing skills, risks, interview questions, recommendations). The `cv_improvement_results` table stores separate AI feedback runs tied to a specific document, independently of any job application.

---

## Project Structure

```
talentscan/
│
├── backend/                               # FastAPI backend
│   ├── app/
│   │   ├── main.py                        # FastAPI entrypoint, CORS configuration, router registration
│   │   ├── pipeline.py                    # Core AI orchestration (screening, parsing, improvement, refinement)
│   │   ├── schemas.py                     # Pydantic models for AI inputs and outputs
│   │   ├── gemini.py                      # OpenRouter LLM client wrapper (text + structured JSON generation)
│   │   │
│   │   ├── core/
│   │   │   └── config.py                  # Environment variable loading (Settings class, .env reader)
│   │   │
│   │   ├── api/                           # HTTP layer — routers and request/response models
│   │   │   ├── auth.py                    # Register, login, logout, /me
│   │   │   ├── jobs.py                    # Job CRUD and AI-powered job description refinement
│   │   │   ├── documents.py               # CV upload, AI parsing, file serving, document deletion
│   │   │   ├── screening.py               # Single and bulk CV screening, application management
│   │   │   ├── improvement.py             # CV analysis and improvement suggestions
│   │   │   ├── users.py                   # Candidate and HR profile read/update endpoints
│   │   │   ├── models.py                  # Shared Pydantic request/response schemas
│   │   │   └── helpers/
│   │   │       └── ownership.py           # JWT auth dependency (get_current_user)
│   │   │
│   │   └── services/
│   │       ├── llm/
│   │       │   ├── schemas.py             # JSON schemas for LLM structured output validation
│   │       │   ├── job_templates.py       # Regional legal clause templates (US / EU / Asia)
│   │       │   ├── evaluate_match.md      # CV screening prompt template
│   │       │   └── improve_cv.md          # CV improvement prompt template
│   │       │
│   │       └── parsing/
│   │           ├── pdf.py                 # PDF → plain text extraction (pypdf)
│   │           ├── docx.py                # DOCX → plain text extraction (python-docx)
│   │           └── clean.py               # Text normalization and whitespace cleanup
│   │
│   └── database/
│       ├── db.py                          # SQLAlchemy engine and session factory
│       ├── models.py                      # ORM models: Organization, User, Person, Resume, Job, Application, Document, ScreeningResult, CVImprovementResult
│       ├── security.py                    # Password hashing (bcrypt) and JWT creation/verification
│       ├── storage.py                     # Prefixed unique ID generation (new_id)
│       └── create_tables.py               # One-time database initialization script
│
├── frontend/                              # React + TypeScript SPA (Vite + Tailwind CSS)
│   └── src/
│       ├── App.tsx                        # Auth verification, role-based routing to HR or Candidate dashboard
│       ├── store.ts                       # Zustand global state (auth, active tab, job context, batch results)
│       ├── api.ts                         # Axios HTTP client and typed API bindings (authApi, jobsApi, screeningApi, documentsApi)
│       │
│       └── components/
│           ├── AuthTab.tsx                # Login and registration form (both roles)
│           ├── HrDashboard.tsx            # HR shell — sidebar navigation and tab routing
│           ├── CandidateDashboard.tsx     # Candidate shell — sidebar navigation and tab routing
│           ├── HrProfileTab.tsx           # HR profile viewer and editor (basic info, contact, work & location)
│           ├── ProfileTab.tsx             # Candidate master profile (personal info, experience, education, skills)
│           ├── JobTab.tsx                 # Job description CRUD, AI refinement, screening questions editor
│           ├── ScreenTab.tsx              # Bulk CV screening interface — candidate pool table, AI report viewer
│           ├── KanbanTab.tsx              # Recruitment Kanban board with drag-and-drop status management
│           ├── HistoryTab.tsx             # Full screening history log with search and detail modal
│           ├── CompareTab.tsx             # Side-by-side candidate comparison from batch screening results
│           ├── ImproveCvTab.tsx           # CV improvement tool — upload, AI scoring, keyword gap analysis
│           ├── ResumeUploadTab.tsx        # Candidate CV upload and version history
│           └── CanditateJobsTab.tsx       # Job browser and application flow for candidates
│
├── storage/
│   └── resumes/                           # Uploaded PDF and DOCX files stored on disk
│
├── docker-compose.yml                     # PostgreSQL 16 container definition
├── requirements.txt                       # Python backend dependencies
└── README.md
```

---

## API Endpoints

### 1. Authentication

```
POST   /v1/auth/register     Register a new user (hr or candidate role)
POST   /v1/auth/login        Login with email and password, receive JWT access token
GET    /v1/auth/me           Get current authenticated user info
POST   /v1/auth/logout       Logout (client-side token removal)
```

### 2. Jobs

```
POST   /jobs                 Create a new job posting (HR only)
GET    /jobs                 List jobs (scoped to organization for HR, public for candidates)
GET    /jobs/{job_id}        Get job details including parsed screening questions
PUT    /jobs/{job_id}        Update job title, description, region, and screening questions (HR only)
DELETE /jobs/{job_id}        Delete job and all associated applications (HR only)
POST   /jobs/refine          AI-powered job description enrichment with regional legal clauses
```

### 3. Documents & Resumes

```
POST   /v1/documents/upload                  Upload a CV file (PDF, DOCX, TXT) — triggers AI parsing (Candidate only)
GET    /v1/documents/organization            List all candidate CVs in the organization (HR only)
GET    /v1/documents/me                      List own uploaded CV versions
GET    /v1/documents/{document_id}/file      Serve the original binary CV file for in-browser preview
DELETE /v1/documents/{document_id}           Delete a CV document and its associated records
GET    /v1/resumes/latest                    Get the latest parsed resume for the current user
POST   /v1/applications/submit               Public (unauthenticated) job application submission
```

### 4. Screening & Applications

```
POST   /screening/run-file                          Screen a single uploaded CV file against a job (HR only)
POST   /screening/bulk                              Bulk screen multiple candidate CVs against a job (HR only)
PATCH  /applications/{application_id}/status        Update application pipeline status (HR only)
DELETE /applications/{application_id}               Delete an application and its screening result (HR only)
GET    /applications/job/{job_id}                   Get all applications for a specific job (HR only)
GET    /applications/organization                   Get all applications across the organization (HR only)
GET    /applications/answers                        Get a candidate's answers to screening questions (HR only)
POST   /applications/apply                          Candidate applies to a job with optional screening answers
GET    /applications/my                             Get the current candidate's own applications
```

### 5. User Profiles

```
GET    /users/me/profile       Get candidate master profile (personal info, experience, education, skills)
PUT    /users/me/profile       Update candidate master profile
GET    /users/me/hr-profile    Get HR recruiter profile (bio, company, department, timezone)
PUT    /users/me/hr-profile    Update HR recruiter profile
```

### 6. CV Improvement

```
POST   /v1/improve-cv-file     Analyze a CV file and return AI-scored improvement suggestions
```

### 7. Health

```
GET    /health     Service health check
```

---

## Notes

HR users are grouped by organization at registration time. If an organization with the provided name already exists, the new HR user joins it; otherwise a new organization is created automatically. All job postings, candidate CVs, applications, and screening results are isolated per organization.

The AI screening pipeline runs through OpenRouter using a configurable Gemini model. Each screening call produces a structured JSON response that includes a numeric match score (0–100), a hire/maybe/reject decision, an executive summary, matched and missing skills, identified risks, and recommended interview questions. The same LLM client powers CV parsing, CV improvement, and job description refinement, each using a dedicated Markdown prompt template located in `backend/app/services/llm/`.

CV files are stored on disk under `storage/resumes/` and served back as binary responses for in-browser PDF preview. The database record stores a `file_path` pointer alongside the extracted `raw_text`, so the system can function even if the binary is unavailable.

The frontend and backend are fully decoupled and can be deployed independently. The React SPA communicates exclusively through the REST API using a Bearer token stored in `localStorage`. Role detection at the `App.tsx` level routes authenticated users to either the `HrDashboard` or the `CandidateDashboard`, each with its own navigation sidebar and feature set.
