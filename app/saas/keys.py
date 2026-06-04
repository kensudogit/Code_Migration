"""API key generation and verification."""

import hashlib
import secrets


KEY_PREFIX = "cmk_"


def generate_api_key() -> str:
    return f"{KEY_PREFIX}{secrets.token_urlsafe(32)}"


def hash_api_key(raw_key: str) -> str:
    normalized = raw_key.strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def key_display_prefix(raw_key: str) -> str:
    normalized = raw_key.strip()
    if len(normalized) <= 12:
        return normalized[:4] + "…"
    return normalized[:10] + "…"


def is_api_key_format(value: str) -> bool:
    return value.strip().startswith(KEY_PREFIX) and len(value.strip()) >= 16
