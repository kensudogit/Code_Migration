"""Application configuration."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

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

    @property
    def ai_enabled(self) -> bool:
        return bool(self.openai_api_key.strip())


settings = Settings()
