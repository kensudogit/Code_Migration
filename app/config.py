"""Application configuration (local .env + Railway Variables)."""

from typing import Any

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.railway import (
    LOCAL_DATABASE_URL,
    env_presence,
    is_local_database_url,
    is_managed_deploy,
    is_railway,
    resolve_api_port,
    resolve_database_url,
    resolve_openai_api_key,
)

_ENV_FILE: str | None = ".env"
if is_managed_deploy():
    _ENV_FILE = None


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = ""
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_org_id: str = ""
    openai_project: str = ""
    openai_base_url: str = ""
    openai_timeout: float = 300.0
    openai_max_retries: int = 2
    openai_max_output_tokens: int = 16384
    # 0 = no application-level cap on conversion source size
    source_code_max_bytes: int = 0
    # Split large sources across multiple OpenAI calls (line-safe chunks)
    openai_auto_chunk: bool = True
    # Characters per chunk when auto-chunking; 0 disables splitting even if auto_chunk is true
    openai_chunk_chars: int = 80_000
    api_host: str = "0.0.0.0"
    api_port: int = 8090

    @model_validator(mode="after")
    def apply_platform_env(self) -> "Settings":
        resolved_db, _ = resolve_database_url()
        if resolved_db:
            db_url = resolved_db
        elif is_managed_deploy():
            db_url = ""
        else:
            db_url = self.database_url.strip() or LOCAL_DATABASE_URL

        if db_url and is_managed_deploy() and is_local_database_url(db_url):
            db_url = ""

        object.__setattr__(self, "database_url", db_url)

        railway_key = resolve_openai_api_key()
        if railway_key:
            object.__setattr__(self, "openai_api_key", railway_key)

        object.__setattr__(self, "api_port", resolve_api_port(self.api_port))
        return self

    @property
    def ai_enabled(self) -> bool:
        return bool(self.openai_api_key.strip())

    @property
    def postgres_enabled(self) -> bool:
        url = self.database_url.strip()
        if not url:
            return False
        if is_managed_deploy() and is_local_database_url(url):
            return False
        return True

    @property
    def on_railway(self) -> bool:
        return is_railway()

    def setup_status(self, *, postgres_connected: bool) -> dict[str, Any]:
        out: dict[str, Any] = {
            "postgres": postgres_connected,
            "postgres_enabled": self.postgres_enabled,
            "database_url": env_presence("DATABASE_URL"),
            "database_private_url": env_presence("DATABASE_PRIVATE_URL"),
            "openai_api_key": env_presence("OPENAI_API_KEY"),
            "openai_model": self.openai_model,
            "ai_enabled": self.ai_enabled,
            "railway": is_railway(),
            "managed_deploy": is_managed_deploy(),
            "source_code_max_bytes": self.source_code_max_bytes,
            "source_unlimited": self.source_code_max_bytes <= 0,
            "openai_auto_chunk": self.openai_auto_chunk,
            "openai_chunk_chars": self.openai_chunk_chars,
        }
        key = self.openai_api_key.strip()
        if key.startswith("sk-ant"):
            out["openai_api_key_warning"] = (
                "OPENAI_API_KEY looks like an Anthropic key (sk-ant-...). "
                "This app uses the OpenAI API; set an OpenAI key (sk-... or sk-proj-...)."
            )
        if is_managed_deploy() and not self.postgres_enabled:
            out["postgres_hint"] = (
                "PostgreSQL optional. To enable history: add Postgres plugin, "
                "Reference DATABASE_URL on this service, Redeploy."
            )
        if is_railway() and not self.ai_enabled:
            out["hint"] = (
                "Railway service -> Variables -> OPENAI_API_KEY = your OpenAI key -> Redeploy."
            )
        elif is_railway() and not postgres_connected and self.postgres_enabled:
            out["postgres_hint"] = (
                "DATABASE_URL is set but connection failed. Check Postgres plugin reference."
            )
        return out


settings = Settings()
