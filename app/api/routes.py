"""REST API routes."""

import logging
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app import repository
from app.config import settings
from app.db import ping
from app.saas import repository as saas_repo
from app.saas.deps import resolve_tenant
from app.saas.models import Tenant
from app.schemas import (
    ConvertAsyncResponse,
    ConvertRequest,
    ConvertResponse,
    DirectionInfo,
    DirectionsResponse,
    HealthResponse,
    JobDetail,
    JobSummary,
    TokenUsage,
)
from app.services import job_runner
from app.services.converter import convert_code
from app.services.openai_platform import OpenAIPlatformError
from app.services.pairs import SUPPORTED_DIRECTIONS, ConversionDirection, resolve_direction

router = APIRouter()
logger = logging.getLogger("code-migration.routes")


def _resolve_direction_or_400(body: ConvertRequest) -> ConversionDirection:
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
    return direction


def _check_source_size(body: ConvertRequest, tenant: Tenant | None) -> None:
    size = len(body.source_code.encode("utf-8"))
    if tenant is not None and settings.saas_enabled:
        err = saas_repo.check_conversion_allowed(tenant, size)
        if err:
            raise HTTPException(status_code=402, detail=err)
    max_bytes = settings.source_code_max_bytes
    if max_bytes > 0 and size > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Source code exceeds limit ({size} > {max_bytes} bytes). "
            "Set SOURCE_CODE_MAX_BYTES=0 for unlimited.",
        )


def _tenant_id(tenant: Tenant | None) -> UUID | None:
    return tenant.id if tenant else None


def _record_tenant_usage(
    tenant: Tenant | None,
    *,
    prompt_tokens: int | None,
    completion_tokens: int | None,
) -> None:
    if tenant is None or not settings.saas_enabled or not settings.postgres_enabled:
        return
    try:
        saas_repo.record_conversion(
            tenant.id,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
        )
    except Exception as exc:
        logger.warning("record_conversion failed: %s", exc)


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        ok=True,
        postgres=ping(),
        ai_enabled=settings.ai_enabled,
        railway=settings.on_railway,
        openai_configured=settings.ai_enabled,
        postgres_enabled=settings.postgres_enabled,
        saas_enabled=settings.saas_enabled,
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


@router.post("/convert/async", response_model=ConvertAsyncResponse)
async def convert_async(
    body: ConvertRequest,
    background_tasks: BackgroundTasks,
    tenant: Tenant | None = Depends(resolve_tenant),
) -> ConvertAsyncResponse:
    """Start conversion in the background; poll GET /jobs/{job_id} for the result."""
    _check_source_size(body, tenant)
    try:
        _resolve_direction_or_400(body)
    except HTTPException:
        raise
    tid = _tenant_id(tenant)
    try:
        job_id = job_runner.enqueue(body, tenant_id=tid)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    async def _run() -> None:
        await job_runner.execute(job_id, save_history=body.save_history)
        if tenant and settings.saas_enabled:
            row = job_runner.get_job(job_id, tenant_id=tid)
            if row and row.get("status") == "completed":
                _record_tenant_usage(
                    tenant,
                    prompt_tokens=row.get("prompt_tokens"),
                    completion_tokens=row.get("completion_tokens"),
                )

    background_tasks.add_task(_run)
    return ConvertAsyncResponse(job_id=job_id, status="running")


@router.post("/convert", response_model=ConvertResponse)
async def convert(
    body: ConvertRequest,
    tenant: Tenant | None = Depends(resolve_tenant),
) -> ConvertResponse:
    """Synchronous conversion (small sources). Large jobs should use POST /convert/async."""
    _check_source_size(body, tenant)
    direction = _resolve_direction_or_400(body)
    tid = _tenant_id(tenant)

    job_id = None
    model_name = settings.openai_model if settings.ai_enabled else "mock"

    if body.save_history and settings.postgres_enabled:
        try:
            job_id = repository.create_job(
                direction,
                body.source_code,
                model=model_name,
                tenant_id=tid,
            )
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

    _record_tenant_usage(
        tenant,
        prompt_tokens=result.usage.prompt_tokens if result.usage else None,
        completion_tokens=result.usage.completion_tokens if result.usage else None,
    )

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
def jobs(
    limit: int = 50,
    tenant: Tenant | None = Depends(resolve_tenant),
) -> list[JobSummary]:
    if not settings.postgres_enabled:
        return []
    rows = repository.list_jobs(limit=min(limit, 200), tenant_id=_tenant_id(tenant))
    return [JobSummary(**row) for row in rows]


@router.get("/jobs/{job_id}", response_model=JobDetail)
def job_detail(
    job_id: UUID,
    tenant: Tenant | None = Depends(resolve_tenant),
) -> JobDetail:
    row = job_runner.get_job(job_id, tenant_id=_tenant_id(tenant))
    if row is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobDetail(**row)
