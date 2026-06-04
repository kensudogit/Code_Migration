"""Conversion job persistence."""

import json
from datetime import datetime, timezone
from uuid import UUID

from app.db import get_conn
from app.services.pairs import ConversionDirection

# Avoid multi-megabyte rows slowing inserts; full source stays in memory during conversion.
_DB_TEXT_SOFT_LIMIT = 400_000


def _clip_for_db(text: str, *, label: str) -> str:
    if len(text) <= _DB_TEXT_SOFT_LIMIT:
        return text
    return (
        text[:_DB_TEXT_SOFT_LIMIT]
        + f"\n\n/* --- {label} truncated for database storage ({len(text):,} chars total) --- */\n"
    )


def create_job(
    direction: ConversionDirection,
    source_code: str,
    *,
    model: str | None = None,
) -> UUID:
    return create_job_with_id(
        None,
        direction,
        source_code,
        model=model,
    )


def create_job_with_id(
    job_id: UUID | None,
    direction: ConversionDirection,
    source_code: str,
    *,
    model: str | None = None,
) -> UUID:
    stored_source = _clip_for_db(source_code, label="source")
    with get_conn() as conn:
        if job_id is None:
            row = conn.execute(
                """
                INSERT INTO conversion_jobs
                    (source_language, target_language, direction, source_code, status, model)
                VALUES (%s, %s, %s, %s, 'running', %s)
                RETURNING id
                """,
                (
                    direction.source.value,
                    direction.target.value,
                    direction.value,
                    stored_source,
                    model,
                ),
            ).fetchone()
        else:
            row = conn.execute(
                """
                INSERT INTO conversion_jobs
                    (id, source_language, target_language, direction, source_code, status, model)
                VALUES (%s, %s, %s, %s, %s, 'running', %s)
                RETURNING id
                """,
                (
                    job_id,
                    direction.source.value,
                    direction.target.value,
                    direction.value,
                    stored_source,
                    model,
                ),
            ).fetchone()
        conn.commit()
        return row["id"]


def complete_job(
    job_id: UUID,
    result_code: str,
    *,
    prompt_tokens: int | None = None,
    completion_tokens: int | None = None,
    openai_request_id: str | None = None,
    warnings: list[str] | None = None,
) -> None:
    stored_result = _clip_for_db(result_code, label="result")
    with get_conn() as conn:
        conn.execute(
            """
            UPDATE conversion_jobs
            SET result_code = %s,
                status = 'completed',
                completed_at = %s,
                prompt_tokens = %s,
                completion_tokens = %s,
                openai_request_id = %s,
                warnings = %s
            WHERE id = %s
            """,
            (
                stored_result,
                datetime.now(timezone.utc),
                prompt_tokens,
                completion_tokens,
                openai_request_id,
                warnings,
                job_id,
            ),
        )
        conn.commit()


def fail_job(job_id: UUID, error: str, *, openai_request_id: str | None = None) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            UPDATE conversion_jobs
            SET status = 'failed',
                error_message = %s,
                completed_at = %s,
                openai_request_id = COALESCE(%s, openai_request_id)
            WHERE id = %s
            """,
            (error[:8000], datetime.now(timezone.utc), openai_request_id, job_id),
        )
        conn.commit()


def list_jobs(limit: int = 50) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, direction, source_language, target_language, status, model,
                   created_at, completed_at, prompt_tokens, completion_tokens
            FROM conversion_jobs
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (limit,),
        ).fetchall()
        return list(rows)


def get_job(job_id: UUID) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM conversion_jobs WHERE id = %s",
            (job_id,),
        ).fetchone()
        if row is None:
            return None
        data = dict(row)
        raw_warnings = data.get("warnings")
        if isinstance(raw_warnings, list):
            data["warnings"] = raw_warnings
        elif raw_warnings is not None:
            data["warnings"] = json.loads(raw_warnings) if isinstance(raw_warnings, str) else raw_warnings
        return data
