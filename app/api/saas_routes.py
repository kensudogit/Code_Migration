"""SaaS tenant and usage API."""

import re

from fastapi import APIRouter, Depends, Header, HTTPException

from app.config import settings
from app.saas import repository as saas_repo
from app.saas.deps import resolve_tenant
from app.saas.keys import generate_api_key
from app.saas.models import Tenant
from app.saas.plans import get_plan
from app.schemas import CreateTenantRequest, CreateTenantResponse, TenantMeResponse

router = APIRouter(prefix="/saas", tags=["saas"])


def _require_admin(x_admin_secret: str | None = Header(None, alias="X-Admin-Secret")) -> None:
    secret = settings.saas_admin_secret.strip()
    if not secret:
        raise HTTPException(status_code=503, detail="SAAS_ADMIN_SECRET is not configured.")
    if not x_admin_secret or x_admin_secret.strip() != secret:
        raise HTTPException(status_code=403, detail="Invalid admin secret.")


@router.get("/me", response_model=TenantMeResponse)
def tenant_me(tenant: Tenant | None = Depends(resolve_tenant)) -> TenantMeResponse:
    if not settings.saas_enabled:
        raise HTTPException(status_code=404, detail="SaaS mode is disabled.")
    if tenant is None:
        raise HTTPException(status_code=401, detail="Tenant context required.")
    limits = tenant.limits
    usage = saas_repo.get_usage(tenant.id)
    conv_limit = limits.monthly_conversions or None
    return TenantMeResponse(
        tenant_id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        plan=tenant.plan,
        plan_label=limits.label,
        period=usage.period,
        conversions_used=usage.conversions_count,
        conversions_limit=conv_limit,
        prompt_tokens=usage.prompt_tokens,
        completion_tokens=usage.completion_tokens,
        max_source_bytes=limits.max_source_bytes or None,
    )


@router.post("/tenants", response_model=CreateTenantResponse)
def create_tenant(
    body: CreateTenantRequest,
    _: None = Depends(_require_admin),
) -> CreateTenantResponse:
    if not settings.saas_enabled:
        raise HTTPException(status_code=404, detail="SaaS mode is disabled.")
    if not settings.postgres_enabled:
        raise HTTPException(status_code=503, detail="PostgreSQL required for SaaS.")

    slug = body.slug.strip().lower()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,63}", slug):
        raise HTTPException(status_code=400, detail="Invalid slug.")

    plan = body.plan.strip().lower()
    if plan not in ("free", "pro", "enterprise"):
        raise HTTPException(status_code=400, detail="plan must be free, pro, or enterprise.")

    if saas_repo.get_tenant_by_slug(slug):
        raise HTTPException(status_code=409, detail="Slug already exists.")

    tenant = saas_repo.create_tenant(name=body.name.strip(), slug=slug, plan=plan)
    raw_key = generate_api_key()
    saas_repo.create_api_key(tenant.id, raw_key, label="initial")
    return CreateTenantResponse(
        tenant_id=tenant.id,
        slug=tenant.slug,
        plan=tenant.plan,
        api_key=raw_key,
    )
