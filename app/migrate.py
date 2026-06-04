"""Apply SQL migrations on startup (idempotent)."""

from pathlib import Path

from app.config import settings
from app.db import get_conn

MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations"


def apply_migrations() -> None:
    if not settings.postgres_enabled:
        return
    sql_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not sql_files:
        return

    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        applied = {
            row["version"]
            for row in conn.execute("SELECT version FROM schema_migrations").fetchall()
        }
        for path in sql_files:
            if path.name in applied:
                continue
            conn.execute(path.read_text(encoding="utf-8"))
            conn.execute(
                "INSERT INTO schema_migrations (version) VALUES (%s)",
                (path.name,),
            )
        conn.commit()
