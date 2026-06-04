"""Split large source files for multi-request OpenAI conversion (no app input cap)."""

from __future__ import annotations


def split_source_lines(source_code: str, max_chars: int) -> list[str]:
    """
    Split source into chunks at line boundaries.
    max_chars <= 0 means no splitting (single chunk).
    """
    text = source_code if source_code.endswith("\n") else source_code + "\n"
    if max_chars <= 0 or len(text) <= max_chars:
        return [source_code]

    lines = text.splitlines(keepends=True)
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for line in lines:
        line_len = len(line)
        if line_len > max_chars:
            if current:
                chunks.append("".join(current))
                current = []
                current_len = 0
            for i in range(0, line_len, max_chars):
                chunks.append(line[i : i + max_chars])
            continue

        if current_len + line_len > max_chars and current:
            chunks.append("".join(current))
            current = []
            current_len = 0

        current.append(line)
        current_len += line_len

    if current:
        chunks.append("".join(current))

    return chunks if chunks else [source_code]


def merge_converted_chunks(parts: list[str], target: str) -> str:
    """Join chunk outputs with a visible separator."""
    if len(parts) <= 1:
        return parts[0] if parts else ""
    sep = {
        "python": "\n\n# --- continued ---\n\n",
        "java": "\n\n// --- continued ---\n\n",
        "typescript": "\n\n// --- continued ---\n\n",
        "cobol": "\n      * --- continued ---\n",
    }.get(target, "\n\n/* --- continued --- */\n\n")
    return sep.join(p.strip("\n") for p in parts if p.strip())
