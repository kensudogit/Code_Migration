"""SaaS domain types."""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.saas.plans import PlanLimits, get_plan


@dataclass
class Tenant:
    id: UUID
    name: str
    slug: str
    plan: str
    status: str
    created_at: datetime

    @property
    def limits(self) -> PlanLimits:
        return get_plan(self.plan)


@dataclass
class TenantUsage:
    period: str
    conversions_count: int
    prompt_tokens: int
    completion_tokens: int

    @property
    def total_tokens(self) -> int:
        return self.prompt_tokens + self.completion_tokens
