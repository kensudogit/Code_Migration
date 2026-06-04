"""Per-model OpenAI completion token ceilings (avoid 400 invalid max_tokens)."""

from __future__ import annotations

# Known completion-token limits (conservative defaults for chat.completions max_tokens)
_MODEL_OUTPUT_CAPS: tuple[tuple[str, int], ...] = (
    ("gpt-4.1-mini", 32_768),
    ("gpt-4.1-nano", 32_768),
    ("gpt-4.1", 32_768),
    ("gpt-4o-mini", 16_384),
    ("gpt-4o", 16_384),
    ("gpt-4-turbo", 16_384),
    ("gpt-4", 8_192),
    ("gpt-3.5-turbo", 16_384),
)

_DEFAULT_CAP = 16_384


def model_output_token_cap(model: str) -> int:
    """Maximum completion tokens the model accepts for max_tokens."""
    name = (model or "").strip().lower()
    if not name:
        return _DEFAULT_CAP
    for prefix, cap in _MODEL_OUTPUT_CAPS:
        if name == prefix or name.startswith(prefix + "-") or name.startswith(prefix):
            return cap
    if "4.1" in name:
        return 32_768
    if "4o" in name or "3.5" in name:
        return 16_384
    return _DEFAULT_CAP


def clamp_max_output_tokens(model: str, requested: int) -> int:
    cap = model_output_token_cap(model)
    value = max(256, requested)
    return min(value, cap)
