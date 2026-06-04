"""PostgreSQL connection pool."""

from contextlib import contextmanager
from typing import Generator

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.config import settings

_pool: ConnectionPool | None = None


def init_pool() -> None:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=settings.database_url,
            min_size=1,
            max_size=10,
            kwargs={"row_factory": dict_row},
        )


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


@contextmanager
def get_conn() -> Generator[psycopg.Connection, None, None]:
    if _pool is None:
        init_pool()
    assert _pool is not None
    with _pool.connection() as conn:
        yield conn


def ping() -> bool:
    try:
        with get_conn() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception:
        return False
