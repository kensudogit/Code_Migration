"""AI-powered code conversion."""

from __future__ import annotations

from app.config import settings
from app.services.openai_platform import ConversionResult, convert_with_openai
from app.services.pairs import ConversionDirection, Language


def _mock_convert(direction: ConversionDirection, source_code: str) -> ConversionResult:
    """Offline placeholder when OPENAI_API_KEY is not set."""
    header = {
        Language.JAVA: "// Converted (mock)",
        Language.PYTHON: "# Converted (mock)",
        Language.TYPESCRIPT: "// Converted (mock)",
        Language.COBOL: "      * Converted (mock)",
    }[direction.target]
    note = (
        f"{header}\n"
        f"# Direction: {direction.label}\n"
        f"# Set OPENAI_API_KEY in .env for real AI conversion.\n\n"
    )
    if direction.target == Language.PYTHON:
        code = note + f'"""Stub from {direction.source.value}."""\n\n# Original:\n"""\n{source_code.strip()}\n"""\n'
    elif direction.target == Language.JAVA:
        code = (
            note
            + f"public class Converted {{\n"
            + f"    // Original {direction.source.value} source preserved in comment block\n"
            + f"    /*\n{source_code.strip()}\n    */\n"
            + "}\n"
        )
    elif direction.target == Language.TYPESCRIPT:
        code = note + f"// Original:\n/*\n{source_code.strip()}\n*/\nexport {{}};\n"
    else:
        code = note + f"      * Original:\n      * {source_code.strip()[:200].replace(chr(10), ' ')}\n"

    return ConversionResult(
        result_code=code,
        model="mock",
        is_mock=True,
        warnings=["Mock mode: set OPENAI_API_KEY for real AI conversion."],
    )


async def convert_code(direction: ConversionDirection, source_code: str) -> ConversionResult:
    if not settings.ai_enabled:
        return _mock_convert(direction, source_code)
    return await convert_with_openai(direction, source_code)
