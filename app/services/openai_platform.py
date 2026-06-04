"""OpenAI Platform client: Structured Outputs, org/project settings, error mapping."""

from __future__ import annotations

import json
from dataclasses import dataclass, field

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

SYSTEM_PROMPT = """You are an expert software migration engineer.
Convert source code accurately between languages while preserving business logic.
Rules:
- Put the full converted source in converted_code only (no markdown fences).
- List any migration caveats or manual follow-ups in warnings (empty array if none).
- Use idiomatic constructs in the target language.
- Preserve meaningful comments; adapt comment style to the target ecosystem.
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
            "description": "Optional brief migration notes (not part of source code).",
        },
    },
    "required": ["converted_code", "warnings"],
    "additionalProperties": False,
}


@dataclass
class TokenUsage:
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None


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


def _build_user_prompt(direction: ConversionDirection, source_code: str) -> str:
    hint = DIRECTION_HINTS[direction]
    return (
        f"Task: {direction.label}\n"
        f"Instructions: {hint}\n\n"
        f"Source code ({direction.source.value}):\n"
        f"```\n{source_code.strip()}\n```"
    )


def _parse_structured_content(raw: str) -> tuple[str, list[str], str | None]:
    data = json.loads(raw)
    converted = (data.get("converted_code") or "").strip()
    warnings_raw = data.get("warnings") or []
    warnings = [str(w).strip() for w in warnings_raw if str(w).strip()]
    notes = data.get("notes")
    notes_str = str(notes).strip() if notes else None
    if not converted:
        raise OpenAIPlatformError("OpenAI returned empty converted_code.", 502)
    return converted, warnings, notes_str


async def convert_with_openai(direction: ConversionDirection, source_code: str) -> ConversionResult:
    """Call Chat Completions with Structured Outputs (json_schema)."""
    client = create_openai_client()
    model = settings.openai_model

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_prompt(direction, source_code)},
            ],
            temperature=0.2,
            max_tokens=settings.openai_max_output_tokens,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "code_conversion",
                    "strict": True,
                    "schema": CONVERSION_JSON_SCHEMA,
                },
            },
        )
    except OpenAIPlatformError:
        raise
    except Exception as exc:
        raise map_openai_error(exc) from exc

    request_id = getattr(response, "id", None)
    choice = response.choices[0].message
    raw = (choice.content or "").strip()
    if not raw and getattr(choice, "refusal", None):
        raise OpenAIPlatformError(f"Model refused conversion: {choice.refusal}", 422, request_id=request_id)

    try:
        converted, warnings, notes = _parse_structured_content(raw)
    except json.JSONDecodeError as exc:
        raise OpenAIPlatformError("Failed to parse structured OpenAI response.", 502, request_id=request_id) from exc

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
