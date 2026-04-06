from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api import auth, users, jobs, screening, improvement, documents

app = FastAPI(title="CV Screening API")

origins = [
    "https://happy-hill-018c19800.4.azurestaticapps.net",
    "https://kind-glacier-0e6a06100.6.azurestaticapps.net",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/v1", tags=["Authentication"])
app.include_router(jobs.router, tags=["Jobs"])
app.include_router(screening.router, tags=["Screening"])
app.include_router(improvement.router, tags=["Improvement"])
app.include_router(documents.router, prefix="/v1", tags=["Documents"])
app.include_router(users.router, tags=["Users"])

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "cv-screening",
    }