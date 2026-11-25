"""FastAPI application entry point for HealthTrack."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Healthcare symptom tracking API for HealthTrack.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["Health"])
def health_check() -> dict[str, str]:
    """Return service health status for readiness verification."""
    return {"status": "ok", "service": "healthtrack-api"}
