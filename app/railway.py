"""Railway environment detection and variable resolution."""

from __future__ import annotations

import os
from urllib.parse import quote, urlunparse


def is_railway() -> bool:
    return bool(
        os.getenv("RAILWAY_ENVIRONMENT")
        or os.getenv("RAILWAY_PROJECT_ID")
        or os.getenv("RAILWAY_SERVICE_ID")
    )


def first_env(*keys: str) -> str:
    for key in keys:
        raw = os.getenv(key, "").strip()
        if raw and "${{" not in raw:
            return raw
    return ""


def env_presence(key: str) -> str:
    raw = os.getenv(key, "").strip()
    if not raw:
        return "empty"
    if "${{" in raw:
        return "unresolved"
    return "set"


def normalize_database_url(raw: str) -> str:
    if not raw or "sslmode=" in raw:
        return raw
    if not is_railway() and "railway" not in raw.lower():
        return raw
    sep = "&" if "?" in raw else "?"
    return f"{raw}{sep}sslmode=require"


def database_url_from_components() -> tuple[str, str, bool]:
    host = first_env("PGHOST", "POSTGRES_HOST")
    user = first_env("PGUSER", "POSTGRES_USER")
    password = first_env("PGPASSWORD", "POSTGRES_PASSWORD")
    db_name = first_env("PGDATABASE", "POSTGRES_DB", "POSTGRES_DATABASE") or "railway"
    port = first_env("PGPORT", "POSTGRES_PORT") or "5432"
    if not host or not user:
        return "", "", False
    auth = f"{quote(user, safe='')}:{quote(password, safe='')}" if password else quote(user, safe="")
    url = urlunparse(("postgresql", f"{auth}@{host}:{port}", f"/{db_name}", "", "", ""))
    return url, "PGHOST", True


def resolve_database_url() -> tuple[str, str]:
    for key in (
        "DATABASE_URL",
        "DATABASE_PRIVATE_URL",
        "POSTGRES_URL",
        "POSTGRES_PRIVATE_URL",
    ):
        raw = first_env(key)
        if raw:
            return normalize_database_url(raw), key
    built, source, ok = database_url_from_components()
    if ok:
        return normalize_database_url(built), source
    return "", ""


def resolve_openai_api_key() -> str:
    return first_env("OPENAI_API_KEY")


def resolve_api_port(default: int = 8090) -> int:
    internal = first_env("API_INTERNAL_PORT", "API_PORT")
    if internal.isdigit():
        return int(internal)
    if is_railway() and first_env("UNIFIED_DEPLOY") != "1":
        port = first_env("PORT")
        if port.isdigit():
            return int(port)
    return default
