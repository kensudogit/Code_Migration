"""PostgreSQL connection pool."""

import logging
from contextlib import contextmanager
from typing import Generator

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.config import settings

logger = logging.getLogger("code-migration")
_pool: ConnectionPool | None = None
_pool_open = False


def init_pool() -> None:
    global _pool, _pool_open
    if _pool is not None or not settings.postgres_enabled:
        return
    _pool = ConnectionPool(
        conninfo=settings.database_url,
        min_size=1,
        max_size=10,
        open=False,
        kwargs={"row_factory": dict_row},
    )
    _pool_open = False


def close_pool() -> None:
    global _pool, _pool_open
    if _pool is not None:
        _pool.close()
        _pool = None
    _pool_open = False


def _ensure_pool_open() -> None:
    global _pool_open
    if _pool is None:
        init_pool()
    if _pool is None:
        raise RuntimeError("PostgreSQL is not configured")
    if not _pool_open:
        _pool.open(wait=True, timeout=10)
        _pool_open = True


@contextmanager
def get_conn() -> Generator[psycopg.Connection, None, None]:
    if not settings.postgres_enabled:
        raise RuntimeError("PostgreSQL is not configured")
    _ensure_pool_open()
    assert _pool is not None
    with _pool.connection() as conn:
        yield conn


def ping() -> bool:
    if not settings.postgres_enabled:
        return False
    try:
        with get_conn() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception as exc:
        logger.debug("postgres ping failed: %s", exc)
        return False
