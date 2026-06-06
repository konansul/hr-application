import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api import auth, users, jobs, applications, screening, improvement, documents, resumes, external_jobs, profiles, public, notifications, shares, feedback, activity
from backend.app.scheduler import run_inactivity_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(run_inactivity_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="HR Application API", lifespan=lifespan)

origins = [
    "https://happy-hill-018c19800.4.azurestaticapps.net",
    "https://kind-glacier-0e6a06100.6.azurestaticapps.net",
    "https://orange-forest-05793170f.7.azurestaticapps.net",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "https://hraipp.com",
    "https://www.hraipp.com",
    "https://app.hraipp.com",
    "https://www.app.hraipp.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/v1", tags=["Authentication"])
app.include_router(users.router, prefix="/v1", tags=["Users"])
app.include_router(profiles.router, prefix="/v1", tags=["Profiles"])
app.include_router(documents.router, prefix="/v1", tags=["Documents"])
app.include_router(resumes.router, prefix="/v1", tags=["Resumes"])
app.include_router(jobs.router, prefix="/v1", tags=["Jobs"])
app.include_router(screening.router, prefix="/v1", tags=["Screening"])
app.include_router(applications.router, prefix="/v1", tags=["Applications"])
app.include_router(improvement.router, prefix="/v1", tags=["Improvement"])
app.include_router(external_jobs.router, prefix="/v1", tags=["External Jobs"])
app.include_router(public.router, prefix="/v1", tags=["Public"])
app.include_router(notifications.router, prefix="/v1", tags=["Notifications"])
app.include_router(shares.router, prefix="/v1", tags=["Shares"])
app.include_router(feedback.router, prefix="/v1", tags=["Feedback"])
app.include_router(activity.router, prefix="/v1", tags=["Activity"])

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "cv-screening",
    }