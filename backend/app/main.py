"""FastAPI application entry point for HealthTrack."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers.symptoms import router as symptoms_router


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Initialize database tables on application startup."""
    init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    description="Healthcare symptom tracking API for HealthTrack (synthetic demo prototype).",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(symptoms_router)


@app.get("/api/health", tags=["Health"])
def health_check() -> dict[str, str]:
    """Return service health status for readiness verification."""
    return {"status": "ok", "service": "healthtrack-api"}
