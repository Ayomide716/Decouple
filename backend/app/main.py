from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.base import Base, engine
from app.schemas.analysis import HealthResponse

settings = get_settings()
configure_logging(settings.app_env)
log = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    log.info("startup", env=settings.app_env)
    Base.metadata.create_all(bind=engine)
    log.info("database_tables_ready")
    yield
    log.info("shutdown")


app = FastAPI(
    title="Decouple API",
    description="AI-powered monolith-to-microservices migration platform",
    version="0.1.0",
    docs_url="/docs" if settings.app_env != "production" else None,
    redoc_url="/redoc" if settings.app_env != "production" else None,
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1024)

# ── Routes ────────────────────────────────────────────────────────────────────

app.include_router(api_router)


@app.get("/health", response_model=HealthResponse, tags=["ops"])
def health_check() -> HealthResponse:
    return HealthResponse(status="ok", environment=settings.app_env)
