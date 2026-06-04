"""SaaS persistence."""

from datetime import datetime, timezone
from uuid import UUID, uuid4

from app.db import get_conn
from app.saas.keys import hash_api_key, key_display_prefix
from app.saas.models import Tenant, TenantUsage
from app.saas.plans import get_plan


def _current_period() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def _row_to_tenant(row: dict) -> Tenant:
    return Tenant(
        id=row["id"],
        name=row["name"],
        slug=row["slug"],
        plan=row["plan"],
        status=row["status"],
        created_at=row["created_at"],
    )


def get_tenant_by_id(tenant_id: UUID) -> Tenant | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM tenants WHERE id = %s AND status = 'active'",
            (tenant_id,),
        ).fetchone()
        return _row_to_tenant(row) if row else None


def get_tenant_by_slug(slug: str) -> Tenant | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM tenants WHERE slug = %s AND status = 'active'",
            (slug,),
        ).fetchone()
        return _row_to_tenant(row) if row else None


def get_tenant_by_api_key(raw_key: str) -> Tenant | None:
    digest = hash_api_key(raw_key)
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT t.*
            FROM api_keys k
            JOIN tenants t ON t.id = k.tenant_id
            WHERE k.key_hash = %s AND t.status = 'active'
            """,
            (digest,),
        ).fetchone()
        if row:
            conn.execute(
                "UPDATE api_keys SET last_used_at = %s WHERE key_hash = %s",
                (datetime.now(timezone.utc), digest),
            )
            conn.commit()
        return _row_to_tenant(row) if row else None


def count_tenants() -> int:
    with get_conn() as conn:
        row = conn.execute("SELECT COUNT(*) AS c FROM tenants").fetchone()
        return int(row["c"]) if row else 0


def create_tenant(*, name: str, slug: str, plan: str = "free") -> Tenant:
    tid = uuid4()
    with get_conn() as conn:
        row = conn.execute(
            """
            INSERT INTO tenants (id, name, slug, plan)
            VALUES (%s, %s, %s, %s)
            RETURNING *
            """,
            (tid, name, slug, plan),
        ).fetchone()
        conn.commit()
        return _row_to_tenant(row)


def create_api_key(tenant_id: UUID, raw_key: str, *, label: str = "default") -> str:
    digest = hash_api_key(raw_key)
    prefix = key_display_prefix(raw_key)
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO api_keys (tenant_id, key_hash, key_prefix, label)
            VALUES (%s, %s, %s, %s)
            """,
            (tenant_id, digest, prefix, label),
        )
        conn.commit()
    return prefix


def get_usage(tenant_id: UUID, *, period: str | None = None) -> TenantUsage:
    period = period or _current_period()
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT conversions_count, prompt_tokens, completion_tokens
            FROM tenant_usage
            WHERE tenant_id = %s AND period = %s
            """,
            (tenant_id, period),
        ).fetchone()
        if not row:
            return TenantUsage(period=period, conversions_count=0, prompt_tokens=0, completion_tokens=0)
        return TenantUsage(
            period=period,
            conversions_count=int(row["conversions_count"]),
            prompt_tokens=int(row["prompt_tokens"]),
            completion_tokens=int(row["completion_tokens"]),
        )


def record_conversion(
    tenant_id: UUID,
    *,
    prompt_tokens: int | None = None,
    completion_tokens: int | None = None,
) -> TenantUsage:
    period = _current_period()
    pt = prompt_tokens or 0
    ct = completion_tokens or 0
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO tenant_usage (tenant_id, period, conversions_count, prompt_tokens, completion_tokens)
            VALUES (%s, %s, 1, %s, %s)
            ON CONFLICT (tenant_id, period) DO UPDATE SET
                conversions_count = tenant_usage.conversions_count + 1,
                prompt_tokens = tenant_usage.prompt_tokens + EXCLUDED.prompt_tokens,
                completion_tokens = tenant_usage.completion_tokens + EXCLUDED.completion_tokens,
                updated_at = NOW()
            """,
            (tenant_id, period, pt, ct),
        )
        conn.commit()
    return get_usage(tenant_id, period=period)


def check_conversion_allowed(tenant: Tenant, source_byte_size: int) -> str | None:
    """Return error message if conversion not allowed, else None."""
    limits = get_plan(tenant.plan)
    usage = get_usage(tenant.id)
    if limits.monthly_conversions > 0 and usage.conversions_count >= limits.monthly_conversions:
        return (
            f"Monthly conversion limit reached ({limits.monthly_conversions}) for plan '{limits.label}'. "
            "Upgrade to Pro or wait until next month."
        )
    if limits.max_source_bytes > 0 and source_byte_size > limits.max_source_bytes:
        return (
            f"Source exceeds plan limit ({source_byte_size:,} > {limits.max_source_bytes:,} bytes). "
            "Upgrade plan or reduce file size."
        )
    return None
