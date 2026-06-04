"""Pydantic schemas for API."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.services.pairs import ConversionDirection, Language


class HealthResponse(BaseModel):
    ok: bool
    postgres: bool
    ai_enabled: bool
    railway: bool = False
    openai_configured: bool = False
    postgres_enabled: bool = False


class DirectionInfo(BaseModel):
    id: str
    label: str
    source: Language
    target: Language


class DirectionsResponse(BaseModel):
    directions: list[DirectionInfo]


class ConvertRequest(BaseModel):
    source_code: str = Field(..., min_length=1, description="Source code to convert")
    direction: ConversionDirection | None = Field(
        None, description="Explicit direction e.g. java_to_python"
    )
    source_language: Language | None = None
    target_language: Language | None = None
    save_history: bool = Field(True, description="Persist job to PostgreSQL")


class TokenUsage(BaseModel):
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None


class ConvertAsyncResponse(BaseModel):
    job_id: UUID
    status: str = "running"
    message: str = "Conversion started. Poll GET /jobs/{job_id} until status is completed or failed."


class ConvertResponse(BaseModel):
    job_id: UUID | None
    direction: ConversionDirection
    source_language: Language
    target_language: Language
    source_code: str | None = Field(
        None,
        description="Omitted by default to keep responses small; source is already in the client.",
    )
    result_code: str
    model: str
    mock: bool = False
    warnings: list[str] = Field(default_factory=list)
    notes: str | None = None
    usage: TokenUsage | None = None
    request_id: str | None = None


class JobSummary(BaseModel):
    id: UUID
    direction: str
    source_language: str
    target_language: str
    status: str
    model: str | None
    created_at: datetime
    completed_at: datetime | None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None


class JobDetail(JobSummary):
    source_code: str = ""
    result_code: str | None = None
    error_message: str | None = None
    warnings: list[str] | None = None
    openai_request_id: str | None = None
    progress: str | None = None
    mock: bool = False
    notes: str | None = None
