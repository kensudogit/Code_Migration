"""Code Migration API - AI code conversion (Java / Python / TypeScript / COBOL)."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import repository
from app.api.routes import router
from app.config import settings
from app.db import close_pool, init_pool, ping
from app.migrate import apply_migrations

logger = logging.getLogger("code-migration")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if settings.postgres_enabled:
        try:
            init_pool()
            apply_migrations()
            stale = repository.fail_stale_running_jobs()
            if stale:
                logger.info("Marked %s stale running job(s) as failed", stale)
            logger.info("PostgreSQL ready")
        except Exception as exc:
            logger.warning("PostgreSQL unavailable at startup (continuing without history): %s", exc)
            close_pool()
    else:
        logger.info("PostgreSQL disabled (DATABASE_URL not configured)")
    yield
    close_pool()


app = FastAPI(
    title="Code Migration API",
    description=(
        "AI-powered code conversion: Java <-> Python, Java <-> TypeScript, COBOL <-> Java. "
        "History stored in PostgreSQL when configured."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.exception_handler(Exception)
async def unhandled_exception(_request: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal error: {type(exc).__name__}: {exc}"},
    )


@app.get("/")
def root():
    return {
        "service": "code-migration",
        "docs": "/docs",
        "health": "/api/v1/health",
        "setup": "/api/v1/setup",
        "directions": "/api/v1/directions",
        "postgres": ping(),
        "postgres_enabled": settings.postgres_enabled,
        "ai_enabled": settings.ai_enabled,
        "railway": settings.on_railway,
    }


@app.get("/health")
def railway_health():
    """Liveness probe (no DB) ? used by start-unified.sh and API-only Railway deploy."""
    return {
        "ok": True,
        "service": "code-migration-api",
        "postgres_enabled": settings.postgres_enabled,
        "ai_enabled": settings.ai_enabled,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
    )
