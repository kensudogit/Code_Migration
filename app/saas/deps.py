"""FastAPI dependencies for SaaS authentication."""

from fastapi import Header, HTTPException, Request

from app.config import settings
from app.saas.models import Tenant
from app.saas import repository as saas_repo
from app.saas.keys import is_api_key_format


def _extract_api_key(
    request: Request,
    x_api_key: str | None,
    authorization: str | None,
) -> str | None:
    if x_api_key and x_api_key.strip():
        return x_api_key.strip()
    if authorization:
        parts = authorization.strip().split(None, 1)
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1].strip()
    header = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
    return header.strip() if header else None


def resolve_tenant(
    request: Request,
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    authorization: str | None = Header(None),
) -> Tenant | None:
    if not settings.saas_enabled:
        return None

    raw = _extract_api_key(request, x_api_key, authorization)
    if raw:
        if not is_api_key_format(raw):
            raise HTTPException(status_code=401, detail="Invalid API key format (expected cmk_…).")
        if not settings.postgres_enabled:
            raise HTTPException(status_code=503, detail="SaaS requires PostgreSQL.")
        tenant = saas_repo.get_tenant_by_api_key(raw)
        if tenant is None:
            raise HTTPException(status_code=401, detail="Invalid or revoked API key.")
        return tenant

    if settings.saas_require_api_key:
        raise HTTPException(
            status_code=401,
            detail="API key required. Send X-API-Key header (cmk_…).",
        )

    if settings.postgres_enabled:
        tenant = saas_repo.get_tenant_by_slug(settings.saas_default_tenant_slug)
        if tenant:
            return tenant

    return None


def require_tenant(
    request: Request,
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    authorization: str | None = Header(None),
) -> Tenant | None:
    return resolve_tenant(request, x_api_key, authorization)
