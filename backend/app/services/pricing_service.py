"""The single place a price is decided.

Every figure the app shows comes from here, carries its own line-by-line
breakdown, and is flagged `is_mock`. The numbers below are placeholders the
team has not yet validated against real Ma'an guide rates — when the real
formula lands, this file is the only thing that changes, and dropping
`is_mock` to False is the switch that stops the UI labelling prices as demo
figures.

Replacing ad-hoc negotiation with one visible formula is the fairness
mechanism: the same trip quotes the same price for every tourist, and the
tourist can see exactly which line items produced it before booking.
"""
from app.models import PriceLine, Provider, Quote

# Call-out fee per role, in JOD. Covers the provider showing up at all.
BASE_FEE_JOD = {
    "guide": 15.0,
    "driver": 20.0,
    "animal_operator": 10.0,
    "vendor": 0.0,
}
DEFAULT_HOURLY_JOD = 10.0
# Groups past this size need more attention/space, so they cost more per head.
LARGE_GROUP_THRESHOLD = 4
PER_EXTRA_PERSON_JOD = 2.0


def quote(provider: Provider, hours: int = 4, group_size: int = 2) -> Quote:
    hours = max(1, hours)
    group_size = max(1, group_size)

    base = BASE_FEE_JOD.get(
        provider.role.value if hasattr(provider.role, "value") else str(provider.role),
        0.0,
    )
    hourly = provider.hourly_rate_jod or DEFAULT_HOURLY_JOD
    time_cost = hourly * hours
    extra_people = max(0, group_size - LARGE_GROUP_THRESHOLD)
    group_cost = PER_EXTRA_PERSON_JOD * extra_people

    lines = [
        PriceLine(
            label_en="Call-out fee",
            label_ar="رسوم الحضور",
            amount_jod=round(base, 2),
        ),
        PriceLine(
            label_en=f"{hours} hours x {hourly:.0f} JOD",
            label_ar=f"{hours} ساعات × {hourly:.0f} دينار",
            amount_jod=round(time_cost, 2),
        ),
    ]
    if group_cost:
        lines.append(
            PriceLine(
                label_en=f"Large group (+{extra_people} people)",
                label_ar=f"مجموعة كبيرة (+{extra_people} أشخاص)",
                amount_jod=round(group_cost, 2),
            )
        )

    return Quote(
        total_jod=round(base + time_cost + group_cost, 2),
        hours=hours,
        group_size=group_size,
        breakdown=lines,
        is_mock=True,
    )
