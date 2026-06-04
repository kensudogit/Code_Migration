"""SaaS plan limits."""

from dataclasses import dataclass
from typing import Literal

PlanId = Literal["free", "pro", "enterprise"]


@dataclass(frozen=True)
class PlanLimits:
    id: PlanId
    label: str
    monthly_conversions: int  # 0 = unlimited
    max_source_bytes: int  # 0 = use global setting only


PLANS: dict[PlanId, PlanLimits] = {
    "free": PlanLimits("free", "Free", monthly_conversions=30, max_source_bytes=512_000),
    "pro": PlanLimits("pro", "Pro", monthly_conversions=500, max_source_bytes=2_000_000),
    "enterprise": PlanLimits(
        "enterprise",
        "Enterprise",
        monthly_conversions=0,
        max_source_bytes=0,
    ),
}


def get_plan(plan_id: str) -> PlanLimits:
    if plan_id in PLANS:
        return PLANS[plan_id]  # type: ignore[index]
    return PLANS["free"]
