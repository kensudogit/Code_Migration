"""Seed default tenant for SaaS mode."""

import logging

from app.config import settings
from app.saas import repository as saas_repo
from app.saas.keys import generate_api_key

logger = logging.getLogger("code-migration.saas")


def ensure_default_tenant() -> None:
    if not settings.saas_enabled or not settings.postgres_enabled:
        return
    if saas_repo.count_tenants() > 0:
        return

    name = settings.saas_default_tenant_name.strip() or "Default"
    slug = settings.saas_default_tenant_slug.strip() or "default"
    tenant = saas_repo.create_tenant(name=name, slug=slug, plan=settings.saas_default_tenant_plan)

    raw = settings.saas_bootstrap_api_key.strip() or generate_api_key()
    prefix = saas_repo.create_api_key(tenant.id, raw, label="bootstrap")

    if settings.saas_bootstrap_api_key.strip():
        logger.info("SaaS default tenant '%s' ready (API key prefix %s)", slug, prefix)
    else:
        logger.warning(
            "SaaS default tenant '%s' created. ONE-TIME API KEY (save now): %s",
            slug,
            raw,
        )
