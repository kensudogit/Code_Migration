"""Application configuration (local .env + Railway Variables)."""

from typing import Any

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.railway import (
    env_presence,
    is_railway,
    resolve_api_port,
    resolve_database_url,
    resolve_openai_api_key,
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql://codemig:codemig@localhost:5433/code_migration"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_org_id: str = ""
    openai_project: str = ""
    openai_base_url: str = ""
    openai_timeout: float = 120.0
    openai_max_retries: int = 2
    openai_max_output_tokens: int = 16384
    api_host: str = "0.0.0.0"
    api_port: int = 8090

    @model_validator(mode="after")
    def apply_platform_env(self) -> "Settings":
        resolved_db, _ = resolve_database_url()
        if resolved_db:
            object.__setattr__(self, "database_url", resolved_db)

        railway_key = resolve_openai_api_key()
        if railway_key:
            object.__setattr__(self, "openai_api_key", railway_key)

        object.__setattr__(self, "api_port", resolve_api_port(self.api_port))
        return self

    @property
    def ai_enabled(self) -> bool:
        return bool(self.openai_api_key.strip())

    @property
    def on_railway(self) -> bool:
        return is_railway()

    def setup_status(self, *, postgres_connected: bool) -> dict[str, Any]:
        out: dict[str, Any] = {
            "postgres": postgres_connected,
            "database_url": env_presence("DATABASE_URL"),
            "database_private_url": env_presence("DATABASE_PRIVATE_URL"),
            "openai_api_key": env_presence("OPENAI_API_KEY"),
            "openai_model": self.openai_model,
            "ai_enabled": self.ai_enabled,
            "railway": is_railway(),
        }
        if is_railway() and not self.ai_enabled:
            out["hint"] = (
                "Railway service → Variables → OPENAI_API_KEY = your OpenAI key → Redeploy. "
                "Do not put the key in JWT_SECRET or DATABASE_URL."
            )
        if is_railway() and not postgres_connected:
            out["postgres_hint"] = (
                "Add PostgreSQL plugin → Reference DATABASE_URL on this service → Redeploy."
            )
        return out


settings = Settings()
