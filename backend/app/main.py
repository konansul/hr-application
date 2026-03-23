from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api import auth, jobs, screening, improvement

app = FastAPI(title="CV Screening API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/v1", tags=["Authentication"])
app.include_router(jobs.router, tags=["Jobs"])
app.include_router(screening.router, tags=["Screening"])
app.include_router(improvement.router, tags=["Improvement"])

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "cv-screening",
    }