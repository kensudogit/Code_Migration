#!/usr/bin/env python3
"""CLI for code conversion."""

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings
from app.db import init_pool
from app.repository import complete_job, create_job, fail_job
from app.services.converter import convert_code
from app.services.pairs import ConversionDirection, resolve_direction, Language


async def run(args: argparse.Namespace) -> int:
    init_pool()
    direction: ConversionDirection | None = None
    if args.direction:
        direction = ConversionDirection(args.direction)
    else:
        direction = resolve_direction(Language(args.from_lang), Language(args.to_lang))
    if direction is None:
        print(
            "Unsupported pair. Use: java python | python java | go python | python go | "
            "go java | java go | java typescript | typescript java | cobol java | java cobol",
            file=sys.stderr,
        )
        return 1

    source = args.file.read_text(encoding="utf-8") if args.file else sys.stdin.read()
    if not source.strip():
        print("Empty source code", file=sys.stderr)
        return 1

    job_id = None
    if not args.no_save:
        job_id = create_job(direction, source, model=settings.openai_model if settings.ai_enabled else "mock")

    try:
        result = await convert_code(direction, source)
        if job_id:
            complete_job(
                job_id,
                result.result_code,
                prompt_tokens=result.usage.prompt_tokens if result.usage else None,
                completion_tokens=result.usage.completion_tokens if result.usage else None,
                openai_request_id=result.request_id,
                warnings=result.warnings or None,
            )
    except Exception as exc:
        if job_id:
            fail_job(job_id, str(exc))
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    if args.json:
        payload = {
            "direction": direction.value,
            "model": result.model,
            "mock": result.is_mock,
            "result": result.result_code,
            "warnings": result.warnings,
            "notes": result.notes,
            "usage": {
                "prompt_tokens": result.usage.prompt_tokens if result.usage else None,
                "completion_tokens": result.usage.completion_tokens if result.usage else None,
                "total_tokens": result.usage.total_tokens if result.usage else None,
            },
            "request_id": result.request_id,
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        if job_id:
            print(f"# job_id: {job_id} model: {result.model} mock: {result.is_mock}", file=sys.stderr)
        if result.warnings:
            for w in result.warnings:
                print(f"# warning: {w}", file=sys.stderr)
        print(result.result_code)
    return 0


def main() -> None:
    p = argparse.ArgumentParser(description="AI code conversion CLI")
    p.add_argument("--direction", choices=[d.value for d in ConversionDirection], help="e.g. java_to_python")
    p.add_argument("--from", dest="from_lang", choices=["java", "python", "typescript", "cobol", "go"])
    p.add_argument("--to", dest="to_lang", choices=["java", "python", "typescript", "cobol", "go"])
    p.add_argument("-f", "--file", type=argparse.FileType("r", encoding="utf-8"))
    p.add_argument("--json", action="store_true")
    p.add_argument("--no-save", action="store_true", help="Skip PostgreSQL history")
    args = p.parse_args()
    raise SystemExit(asyncio.run(run(args)))


if __name__ == "__main__":
    main()
