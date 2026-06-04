#!/usr/bin/env python3
"""Apply SQL migrations (for local dev without docker init)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings
import psycopg

MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations"


def main() -> None:
    sql_files = sorted(MIGRATIONS.glob("*.sql"))
    if not sql_files:
        print("No migrations found")
        return
    with psycopg.connect(settings.database_url) as conn:
        for path in sql_files:
            print(f"Applying {path.name}...")
            conn.execute(path.read_text(encoding="utf-8"))
        conn.commit()
    print("Done.")


if __name__ == "__main__":
    main()
