"""Background conversion jobs (avoids long HTTP hold through Next.js proxy)."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4

from app import repository
from app.config import settings
from app.schemas import ConvertRequest
from app.services.converter import convert_code
from app.services.openai_platform import OpenAIPlatformError
from app.services.pairs import ConversionDirection, resolve_direction

logger = logging.getLogger("code-migration.jobs")

_MAX_MEMORY_JOBS = 40


@dataclass
class RuntimeJob:
    id: UUID
    direction: ConversionDirection
    status: str
    created_at: datetime
    model: str | None = None
    result_code: str | None = None
    error_message: str | None = None
    warnings: list[str] = field(default_factory=list)
    notes: str | None = None
    mock: bool = False
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    request_id: str | None = None
    completed_at: datetime | None = None
    progress: str | None = None


_MEMORY: dict[UUID, RuntimeJob] = {}


def _resolve_direction(body: ConvertRequest) -> ConversionDirection:
    direction = body.direction
    if direction is not None:
        return direction
    if body.source_language is None or body.target_language is None:
        raise ValueError("Provide direction or both source_language and target_language")
    resolved = resolve_direction(body.source_language, body.target_language)
    if resolved is None:
        raise ValueError("Unsupported language pair")
    return resolved


def _prune_memory() -> None:
    if len(_MEMORY) <= _MAX_MEMORY_JOBS:
        return
    done = [j for j in _MEMORY.values() if j.status in ("completed", "failed")]
    done.sort(key=lambda j: j.created_at)
    for job in done[: len(_MEMORY) - _MAX_MEMORY_JOBS + 5]:
        _MEMORY.pop(job.id, None)


async def _run_job(
    job_id: UUID,
    direction: ConversionDirection,
    source_code: str,
    *,
    save_history: bool,
) -> None:
    job = _MEMORY.get(job_id)
    if job is None:
        return
    job.progress = "AI conversion in progress…"
    try:
        result = await convert_code(direction, source_code)
        job.status = "completed"
        job.result_code = result.result_code
        job.warnings = list(result.warnings or [])
        job.notes = result.notes
        job.mock = result.is_mock
        job.model = result.model
        job.request_id = result.request_id
        job.completed_at = datetime.now(timezone.utc)
        job.progress = None
        if result.usage:
            job.prompt_tokens = result.usage.prompt_tokens
            job.completion_tokens = result.usage.completion_tokens

        if save_history and settings.postgres_enabled:
            try:
                repository.complete_job(
                    job_id,
                    result.result_code,
                    prompt_tokens=job.prompt_tokens,
                    completion_tokens=job.completion_tokens,
                    openai_request_id=result.request_id,
                    warnings=job.warnings or None,
                )
            except Exception as exc:
                logger.warning("complete_job failed for %s: %s", job_id, exc)
    except OpenAIPlatformError as exc:
        job.status = "failed"
        job.error_message = str(exc)
        job.completed_at = datetime.now(timezone.utc)
        job.progress = None
        if save_history and settings.postgres_enabled:
            try:
                repository.fail_job(job_id, str(exc), openai_request_id=exc.request_id)
            except Exception as db_exc:
                logger.warning("fail_job failed for %s: %s", job_id, db_exc)
    except Exception as exc:
        logger.exception("background convert failed for %s", job_id)
        job.status = "failed"
        job.error_message = f"Conversion failed: {exc}"
        job.completed_at = datetime.now(timezone.utc)
        job.progress = None
        if save_history and settings.postgres_enabled:
            try:
                repository.fail_job(job_id, str(exc))
            except Exception as db_exc:
                logger.warning("fail_job failed for %s: %s", job_id, db_exc)


async def start(body: ConvertRequest) -> UUID:
    """Enqueue conversion; returns immediately with job id."""
    direction = _resolve_direction(body)
    model_name = settings.openai_model if settings.ai_enabled else "mock"
    job_id = uuid4()

    if body.save_history and settings.postgres_enabled:
        try:
            job_id = repository.create_job(direction, body.source_code, model=model_name)
        except Exception as exc:
            logger.warning("create_job failed (using in-memory job only): %s", exc)

    job = RuntimeJob(
        id=job_id,
        direction=direction,
        status="running",
        created_at=datetime.now(timezone.utc),
        model=model_name,
        progress="Queued…",
    )
    _MEMORY[job_id] = job
    _prune_memory()

    asyncio.create_task(
        _run_job(job_id, direction, body.source_code, save_history=body.save_history)
    )
    return job_id


def get_job(job_id: UUID, *, include_source: bool = False) -> dict | None:
    """Job status for polling; omits large source_code by default."""
    mem = _MEMORY.get(job_id)
    if mem is not None:
        return {
            "id": mem.id,
            "direction": mem.direction.value,
            "source_language": mem.direction.source.value,
            "target_language": mem.direction.target.value,
            "status": mem.status,
            "model": mem.model,
            "created_at": mem.created_at,
            "completed_at": mem.completed_at,
            "result_code": mem.result_code,
            "error_message": mem.error_message,
            "warnings": mem.warnings or None,
            "source_code": "" if not include_source else None,
            "prompt_tokens": mem.prompt_tokens,
            "completion_tokens": mem.completion_tokens,
            "openai_request_id": mem.request_id,
            "progress": mem.progress,
            "mock": mem.mock,
            "notes": mem.notes,
        }

    if settings.postgres_enabled:
        row = repository.get_job(job_id)
        if row is None:
            return None
        data = dict(row)
        if not include_source:
            data["source_code"] = ""
        data.setdefault("progress", None)
        data.setdefault("mock", False)
        data.setdefault("notes", None)
        return data
    return None
