"""Background conversion jobs (avoids long HTTP hold through Next.js proxy)."""

from __future__ import annotations

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

_MAX_MEMORY_JOBS = 60
_TERMINAL = frozenset({"completed", "failed"})


@dataclass
class RuntimeJob:
    id: UUID
    direction: ConversionDirection
    source_code: str
    status: str
    created_at: datetime
    tenant_id: UUID | None = None
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
    done = [j for j in _MEMORY.values() if j.status in _TERMINAL]
    done.sort(key=lambda j: j.created_at)
    for job in done[: max(0, len(_MEMORY) - _MAX_MEMORY_JOBS + 10)]:
        _MEMORY.pop(job.id, None)


def _mem_to_dict(mem: RuntimeJob, *, include_source: bool) -> dict:
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
        "source_code": mem.source_code if include_source else "",
        "prompt_tokens": mem.prompt_tokens,
        "completion_tokens": mem.completion_tokens,
        "openai_request_id": mem.request_id,
        "progress": mem.progress,
        "mock": mem.mock,
        "notes": mem.notes,
    }


def _row_to_dict(row: dict, *, include_source: bool) -> dict:
    data = dict(row)
    if not include_source:
        data["source_code"] = ""
    data.setdefault("progress", None)
    data.setdefault("mock", False)
    data.setdefault("notes", None)
    return data


def enqueue(body: ConvertRequest, *, tenant_id: UUID | None = None) -> UUID:
    """Register job in memory and return id immediately (no DB write yet)."""
    direction = _resolve_direction(body)
    model_name = settings.openai_model if settings.ai_enabled else "mock"
    job_id = uuid4()
    job = RuntimeJob(
        id=job_id,
        direction=direction,
        source_code=body.source_code,
        status="running",
        created_at=datetime.now(timezone.utc),
        tenant_id=tenant_id,
        model=model_name,
        progress="Queued…",
    )
    _MEMORY[job_id] = job
    _prune_memory()
    return job_id


async def execute(job_id: UUID, *, save_history: bool) -> None:
    """Run DB persist (if any) and AI conversion. Invoked via FastAPI BackgroundTasks."""
    job = _MEMORY.get(job_id)
    if job is None:
        logger.error("execute called for unknown job %s", job_id)
        return

    if save_history and settings.postgres_enabled:
        job.progress = "Saving job to database…"
        try:
            repository.create_job_with_id(
                job_id,
                job.direction,
                job.source_code,
                model=job.model,
                tenant_id=job.tenant_id,
            )
        except Exception as exc:
            logger.warning("create_job_with_id failed for %s: %s", job_id, exc)

    await _run_conversion(job_id, job.direction, job.source_code, save_history=save_history)


async def _run_conversion(
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
    """Backward-compatible entry: enqueue only (caller must schedule execute)."""
    return enqueue(body)


def get_job(
    job_id: UUID,
    *,
    include_source: bool = False,
    tenant_id: UUID | None = None,
) -> dict | None:
    """Merged view: in-memory state wins when it has reached a terminal status."""
    mem = _MEMORY.get(job_id)
    if mem is not None and tenant_id is not None and mem.tenant_id != tenant_id:
        return None
    row = (
        repository.get_job(job_id, tenant_id=tenant_id)
        if settings.postgres_enabled
        else None
    )

    if mem is None and row is None:
        return None
    if mem is None:
        return _row_to_dict(row, include_source=include_source)
    if row is None:
        return _mem_to_dict(mem, include_source=include_source)

    mem_terminal = mem.status in _TERMINAL
    row_status = row.get("status")
    row_terminal = row_status in _TERMINAL
    row_has_result = bool((row.get("result_code") or "").strip())

    if mem_terminal:
        data = _mem_to_dict(mem, include_source=include_source)
        if not (data.get("result_code") or "").strip() and row_has_result:
            data["result_code"] = row["result_code"]
        return data

    if row_terminal and row_status == "failed":
        return _row_to_dict(row, include_source=include_source)

    if row_terminal and row_has_result:
        return _row_to_dict(row, include_source=include_source)

    return _mem_to_dict(mem, include_source=include_source)
