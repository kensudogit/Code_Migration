"""OpenAI Platform client: Structured Outputs, org/project settings, error mapping."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AsyncOpenAI,
    AuthenticationError,
    BadRequestError,
    RateLimitError,
)

from app.config import settings
from app.services.pairs import ConversionDirection
from app.services.source_chunking import merge_converted_chunks, split_source_lines

SYSTEM_PROMPT = """You are an expert software migration engineer.
Convert source code accurately between languages while preserving business logic.
Rules:
- Put the full converted source in converted_code only (no markdown fences).
- List any migration caveats or manual follow-ups in warnings (empty array if none).
- Use idiomatic constructs in the target language.
- Preserve meaningful comments; adapt comment style to the target ecosystem.
- When the input is a fragment of a larger file, convert only that fragment consistently.
- Set notes to an empty string if you have no extra migration commentary.
"""

DIRECTION_HINTS: dict[ConversionDirection, str] = {
    ConversionDirection.JAVA_TO_PYTHON: (
        "Convert Java to Python 3. Use type hints where helpful. "
        "Map classes to dataclasses or plain classes, streams to list comprehensions."
    ),
    ConversionDirection.PYTHON_TO_JAVA: (
        "Convert Python 3 to Java 17+. Use proper package structure; default class if missing."
    ),
    ConversionDirection.JAVA_TO_TYPESCRIPT: (
        "Convert Java to TypeScript. Prefer interfaces for DTOs; target modern ES modules."
    ),
    ConversionDirection.TYPESCRIPT_TO_JAVA: (
        "Convert TypeScript to Java 17+. Map interfaces to Java interfaces or records."
    ),
    ConversionDirection.COBOL_TO_JAVA: (
        "Convert COBOL to Java 17+. Map PIC clauses to Java types; PERFORM to methods."
    ),
    ConversionDirection.JAVA_TO_COBOL: (
        "Convert Java to COBOL with IDENTIFICATION and DATA DIVISION structure."
    ),
}

CONVERSION_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "converted_code": {
            "type": "string",
            "description": "Complete converted source code without markdown fences.",
        },
        "warnings": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Migration caveats or items needing manual review.",
        },
        "notes": {
            "type": "string",
            "description": "Brief migration notes not part of source code; use empty string if none.",
        },
    },
    "required": ["converted_code", "warnings", "notes"],
    "additionalProperties": False,
}


@dataclass
class TokenUsage:
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None

    def add(self, other: "TokenUsage | None") -> "TokenUsage":
        if other is None:
            return self
        return TokenUsage(
            prompt_tokens=_sum_optional(self.prompt_tokens, other.prompt_tokens),
            completion_tokens=_sum_optional(self.completion_tokens, other.completion_tokens),
            total_tokens=_sum_optional(self.total_tokens, other.total_tokens),
        )


def _sum_optional(a: int | None, b: int | None) -> int | None:
    if a is None and b is None:
        return None
    return (a or 0) + (b or 0)


@dataclass
class ConversionResult:
    result_code: str
    model: str
    is_mock: bool = False
    warnings: list[str] = field(default_factory=list)
    notes: str | None = None
    usage: TokenUsage | None = None
    request_id: str | None = None


class OpenAIPlatformError(Exception):
    """OpenAI API failure mapped to an HTTP status for FastAPI."""

    def __init__(self, message: str, status_code: int, *, request_id: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.request_id = request_id


def create_openai_client() -> AsyncOpenAI:
    """Build AsyncOpenAI per OpenAI Platform configuration."""
    kwargs: dict = {
        "api_key": settings.openai_api_key,
        "timeout": settings.openai_timeout,
        "max_retries": settings.openai_max_retries,
    }
    if settings.openai_org_id.strip():
        kwargs["organization"] = settings.openai_org_id.strip()
    if settings.openai_project.strip():
        kwargs["project"] = settings.openai_project.strip()
    if settings.openai_base_url.strip():
        kwargs["base_url"] = settings.openai_base_url.strip()
    return AsyncOpenAI(**kwargs)


def map_openai_error(exc: Exception) -> OpenAIPlatformError:
    request_id = getattr(exc, "request_id", None)
    if isinstance(exc, AuthenticationError):
        return OpenAIPlatformError("Invalid OpenAI API key or organization.", 401, request_id=request_id)
    if isinstance(exc, RateLimitError):
        return OpenAIPlatformError("OpenAI rate limit exceeded. Retry later.", 429, request_id=request_id)
    if isinstance(exc, (APITimeoutError, APIConnectionError)):
        return OpenAIPlatformError("OpenAI service unreachable or timed out.", 503, request_id=request_id)
    if isinstance(exc, BadRequestError):
        return OpenAIPlatformError(f"OpenAI request rejected: {exc}", 400, request_id=request_id)
    if isinstance(exc, APIStatusError):
        status = exc.status_code if 400 <= exc.status_code < 600 else 502
        return OpenAIPlatformError(f"OpenAI API error: {exc}", status, request_id=request_id)
    return OpenAIPlatformError(str(exc), 502, request_id=request_id)


def _build_user_prompt(
    direction: ConversionDirection,
    source_code: str,
    *,
    part_label: str | None = None,
) -> str:
    hint = DIRECTION_HINTS[direction]
    part_note = f"\nNote: {part_label}\n" if part_label else ""
    return (
        f"Task: {direction.label}\n"
        f"Instructions: {hint}{part_note}\n\n"
        f"Source code ({direction.source.value}):\n"
        f"```\n{source_code.strip()}\n```"
    )


def _strip_markdown_json_fence(raw: str) -> str:
    text = raw.strip()
    if not text.startswith("```"):
        return text
    lines = text.split("\n")
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _loads_json_object(raw: str) -> dict[str, Any]:
    text = _strip_markdown_json_fence(raw)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end <= start:
            raise
        data = json.loads(text[start : end + 1])
    if not isinstance(data, dict):
        raise json.JSONDecodeError("Expected JSON object", text, 0)
    return data


def _coerce_payload(data: dict[str, Any]) -> tuple[str, list[str], str | None]:
    converted = data.get("converted_code") or data.get("code") or data.get("result")
    if converted is None:
        raise OpenAIPlatformError("OpenAI response missing converted_code.", 502)
    converted_str = str(converted).strip()
    if converted_str.startswith("```"):
        converted_str = _strip_markdown_json_fence(converted_str)
    warnings_raw = data.get("warnings") or []
    if isinstance(warnings_raw, str):
        warnings_raw = [warnings_raw] if warnings_raw.strip() else []
    warnings = [str(w).strip() for w in warnings_raw if str(w).strip()]
    notes = data.get("notes")
    notes_str = str(notes).strip() if notes is not None and str(notes).strip() else None
    if not converted_str:
        raise OpenAIPlatformError("OpenAI returned empty converted_code.", 502)
    return converted_str, warnings, notes_str


def _message_payload(choice) -> dict[str, Any]:
    parsed = getattr(choice, "parsed", None)
    if parsed is not None:
        if isinstance(parsed, dict):
            return parsed
        dump = getattr(parsed, "model_dump", None)
        if callable(dump):
            return dump()
    raw = (choice.content or "").strip()
    if not raw:
        return {}
    return _loads_json_object(raw)


def _parse_structured_content(raw: str) -> tuple[str, list[str], str | None]:
    return _coerce_payload(_loads_json_object(raw))


def _try_extract_truncated_code(raw: str) -> str | None:
    """Best-effort extraction when JSON was cut off (max_tokens)."""
    match = re.search(
        r'"converted_code"\s*:\s*"((?:\\.|[^"\\])*)"',
        raw,
        re.DOTALL,
    )
    if not match:
        return None
    try:
        return json.loads(f'"{match.group(1)}"')
    except json.JSONDecodeError:
        return match.group(1).replace("\\n", "\n").replace('\\"', '"')


def _chunk_plan(source_code: str) -> list[str]:
    if not settings.openai_auto_chunk or settings.openai_chunk_chars <= 0:
        return [source_code]
    return split_source_lines(source_code, settings.openai_chunk_chars)


def _response_format(strict_schema: bool) -> dict[str, Any]:
    if strict_schema:
        return {
            "type": "json_schema",
            "json_schema": {
                "name": "code_conversion",
                "strict": True,
                "schema": CONVERSION_JSON_SCHEMA,
            },
        }
    return {"type": "json_object"}


def _result_from_response(response, *, model: str) -> ConversionResult:
    request_id = getattr(response, "id", None)
    choice0 = response.choices[0]
    finish = getattr(choice0, "finish_reason", None)
    message = choice0.message
    raw = (message.content or "").strip()

    if getattr(message, "refusal", None):
        raise OpenAIPlatformError(f"Model refused conversion: {message.refusal}", 422, request_id=request_id)

    try:
        payload = _message_payload(message)
        if payload:
            converted, warnings, notes = _coerce_payload(payload)
        elif raw:
            converted, warnings, notes = _parse_structured_content(raw)
        else:
            raise OpenAIPlatformError("OpenAI returned empty message content.", 502, request_id=request_id)
    except (json.JSONDecodeError, OpenAIPlatformError) as exc:
        if finish == "length" and raw:
            partial = _try_extract_truncated_code(raw)
            if partial:
                converted = partial
                warnings = [
                    "OpenAI output was truncated (token limit). "
                    "Result may be incomplete; use a smaller chunk or raise OPENAI_MAX_OUTPUT_TOKENS."
                ]
                notes = None
            else:
                raise OpenAIPlatformError(
                    "OpenAI output was truncated before JSON completed. "
                    "Reduce source size or set OPENAI_MAX_OUTPUT_TOKENS higher.",
                    502,
                    request_id=request_id,
                ) from exc
        elif isinstance(exc, OpenAIPlatformError):
            raise
        else:
            raise OpenAIPlatformError(
                f"Failed to parse structured OpenAI response: {exc}",
                502,
                request_id=request_id,
            ) from exc

    if finish == "length":
        warnings = list(warnings) + [
            "OpenAI stopped at max output tokens; verify the end of converted code."
        ]

    usage = None
    if response.usage:
        usage = TokenUsage(
            prompt_tokens=response.usage.prompt_tokens,
            completion_tokens=response.usage.completion_tokens,
            total_tokens=response.usage.total_tokens,
        )

    return ConversionResult(
        result_code=converted,
        model=model,
        is_mock=False,
        warnings=warnings,
        notes=notes,
        usage=usage,
        request_id=request_id,
    )


async def _convert_single(
    direction: ConversionDirection,
    source_code: str,
    *,
    part_label: str | None = None,
) -> ConversionResult:
    client = create_openai_client()
    model = settings.openai_model
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": _build_user_prompt(direction, source_code, part_label=part_label)},
    ]
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": settings.openai_max_output_tokens,
    }

    last_error: Exception | None = None
    for strict_schema in (True, False):
        try:
            response = await client.chat.completions.create(
                **kwargs,
                response_format=_response_format(strict_schema),
            )
            return _result_from_response(response, model=model)
        except OpenAIPlatformError as exc:
            if strict_schema and (
                "parse" in str(exc).lower()
                or "missing converted_code" in str(exc).lower()
            ):
                last_error = exc
                continue
            raise
        except Exception as exc:
            mapped = map_openai_error(exc)
            if strict_schema and mapped.status_code in (400, 422):
                last_error = mapped
                continue
            raise mapped from exc

    if isinstance(last_error, OpenAIPlatformError):
        raise last_error
    if last_error:
        raise OpenAIPlatformError(
            "Failed to parse structured OpenAI response. Try a smaller source or another model.",
            502,
        ) from last_error
    raise OpenAIPlatformError("Conversion failed.", 502)


async def convert_with_openai(direction: ConversionDirection, source_code: str) -> ConversionResult:
    """Call OpenAI; auto-chunk very large sources (no application input cap)."""
    chunks = _chunk_plan(source_code)

    if len(chunks) == 1:
        return await _convert_single(direction, chunks[0])

    parts: list[str] = []
    all_warnings: list[str] = [
        f"Source was converted in {len(chunks)} parts ({len(source_code):,} characters total). "
        "Review merged output for continuity."
    ]
    notes_parts: list[str] = []
    usage: TokenUsage | None = None
    last_request_id: str | None = None

    for index, chunk in enumerate(chunks, start=1):
        label = f"This is part {index} of {len(chunks)} of the full source file."
        part_result = await _convert_single(direction, chunk, part_label=label)
        parts.append(part_result.result_code)
        all_warnings.extend(part_result.warnings)
        if part_result.notes:
            notes_parts.append(f"[Part {index}] {part_result.notes}")
        usage = (usage or TokenUsage()).add(part_result.usage)
        if part_result.request_id:
            last_request_id = part_result.request_id

    merged = merge_converted_chunks(parts, direction.target.value)
    return ConversionResult(
        result_code=merged,
        model=settings.openai_model,
        is_mock=False,
        warnings=all_warnings,
        notes="\n".join(notes_parts) if notes_parts else None,
        usage=usage,
        request_id=last_request_id,
    )
