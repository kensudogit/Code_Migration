"""REST API routes."""

import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException

from app import repository
from app.config import settings
from app.db import ping
from app.schemas import (
    ConvertRequest,
    ConvertResponse,
    DirectionInfo,
    DirectionsResponse,
    HealthResponse,
    JobDetail,
    JobSummary,
    TokenUsage,
)
from app.services.converter import convert_code
from app.services.openai_platform import OpenAIPlatformError
from app.services.pairs import SUPPORTED_DIRECTIONS, ConversionDirection, resolve_direction

router = APIRouter()
logger = logging.getLogger("code-migration.routes")


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        ok=True,
        postgres=ping(),
        ai_enabled=settings.ai_enabled,
        railway=settings.on_railway,
        openai_configured=settings.ai_enabled,
        postgres_enabled=settings.postgres_enabled,
    )


@router.get("/setup")
def setup_status() -> dict:
    """Non-secret SaaS / Railway diagnostics."""
    return settings.setup_status(postgres_connected=ping())


@router.get("/directions", response_model=DirectionsResponse)
def list_directions() -> DirectionsResponse:
    items = [
        DirectionInfo(
            id=d.value,
            label=d.label,
            source=d.source,
            target=d.target,
        )
        for d in SUPPORTED_DIRECTIONS
    ]
    return DirectionsResponse(directions=items)


@router.post("/convert", response_model=ConvertResponse)
async def convert(body: ConvertRequest) -> ConvertResponse:
    max_bytes = settings.source_code_max_bytes
    if max_bytes > 0:
        size = len(body.source_code.encode("utf-8"))
        if size > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"Source code exceeds limit ({size} > {max_bytes} bytes). "
                "Set SOURCE_CODE_MAX_BYTES=0 for unlimited.",
            )

    direction: ConversionDirection | None = body.direction
    if direction is None:
        if body.source_language is None or body.target_language is None:
            raise HTTPException(
                status_code=400,
                detail="Provide direction or both source_language and target_language",
            )
        direction = resolve_direction(body.source_language, body.target_language)
        if direction is None:
            raise HTTPException(
                status_code=400,
                detail="Unsupported language pair. Use GET /directions for supported conversions.",
            )

    job_id = None
    model_name = settings.openai_model if settings.ai_enabled else "mock"

    if body.save_history and settings.postgres_enabled:
        try:
            job_id = repository.create_job(direction, body.source_code, model=model_name)
        except Exception as exc:
            logger.warning("create_job failed (conversion continues): %s", exc)

    try:
        result = await convert_code(direction, body.source_code)
    except OpenAIPlatformError as exc:
        if job_id is not None:
            try:
                repository.fail_job(job_id, str(exc), openai_request_id=exc.request_id)
            except Exception as db_exc:
                logger.warning("fail_job after OpenAI error: %s", db_exc)
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("convert failed for %s", direction.value)
        if job_id is not None:
            try:
                repository.fail_job(job_id, str(exc))
            except Exception as db_exc:
                logger.warning("fail_job after conversion error: %s", db_exc)
        raise HTTPException(status_code=502, detail=f"Conversion failed: {exc}") from exc

    if job_id is not None:
        try:
            repository.complete_job(
                job_id,
                result.result_code,
                prompt_tokens=result.usage.prompt_tokens if result.usage else None,
                completion_tokens=result.usage.completion_tokens if result.usage else None,
                openai_request_id=result.request_id,
                warnings=result.warnings or None,
            )
        except Exception as exc:
            logger.warning("complete_job failed (result still returned): %s", exc)

    usage = None
    if result.usage:
        usage = TokenUsage(
            prompt_tokens=result.usage.prompt_tokens,
            completion_tokens=result.usage.completion_tokens,
            total_tokens=result.usage.total_tokens,
        )

    return ConvertResponse(
        job_id=job_id,
        direction=direction,
        source_language=direction.source,
        target_language=direction.target,
        result_code=result.result_code,
        model=result.model,
        mock=result.is_mock,
        warnings=result.warnings,
        notes=result.notes,
        usage=usage,
        request_id=result.request_id,
    )


@router.get("/jobs", response_model=list[JobSummary])
def jobs(limit: int = 50) -> list[JobSummary]:
    if not settings.postgres_enabled:
        return []
    rows = repository.list_jobs(limit=min(limit, 200))
    return [JobSummary(**row) for row in rows]


@router.get("/jobs/{job_id}", response_model=JobDetail)
def job_detail(job_id: UUID) -> JobDetail:
    row = repository.get_job(job_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobDetail(**row)
