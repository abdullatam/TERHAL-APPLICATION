"""The single place a price is decided.

Every figure the app shows comes from here and carries its own line-by-line
breakdown. Replacing ad-hoc negotiation with one visible rate is the fairness
mechanism: the same trip quotes the same price for every tourist, and the
tourist sees exactly what produced it before agreeing to anything.

A guide is **25 JOD an hour**, agreed by the team on 7 Sept. That is the whole
rule — no call-out fee, no group surcharge, no per-guide haggling. It is the
one number a tourist has to trust, and it is the same for every guide in the
governorate.

Two prices exist for one trip, and the difference is the point:

* `quote()` is the **estimate**, taken from the plan the tourist built. It is
  what they see before booking.
* `settle()` is the **actual**, taken from how long the trip really ran,
  measured between the guide starting it and ending it.

Nobody is billed for the estimate. A trip that finishes early costs less.
"""
from app.models import PriceLine, Provider, Quote

# The agreed guide rate. One number, same for everyone.
GUIDE_HOURLY_JOD = 25.0

# Other roles were not part of the 7 Sept decision and keep the earlier
# formula, so this change does not silently reprice drivers and vendors.
BASE_FEE_JOD = {"driver": 20.0, "animal_operator": 10.0, "vendor": 0.0}
DEFAULT_HOURLY_JOD = 10.0
LARGE_GROUP_THRESHOLD = 4
PER_EXTRA_PERSON_JOD = 2.0

# Metering rules for a real trip. A guide who turns up has given up the slot,
# so the first hour is owed whatever happens; past that, time is billed to the
# next quarter hour rather than rounded up to a whole one.
MINIMUM_BILLED_MINUTES = 60
BILLING_INCREMENT_MINUTES = 15


def role_of(provider: Provider) -> str:
    role = provider.role
    return role.value if hasattr(role, "value") else str(role)


def is_guide(provider: Provider) -> bool:
    return role_of(provider) == "guide"


def billable_minutes(elapsed_minutes: int) -> int:
    """Round elapsed time up to the next billing increment, never below the
    minimum. 62 minutes bills as 75; 20 minutes bills as 60."""
    minutes = max(MINIMUM_BILLED_MINUTES, int(elapsed_minutes))
    remainder = minutes % BILLING_INCREMENT_MINUTES
    if remainder:
        minutes += BILLING_INCREMENT_MINUTES - remainder
    return minutes


def _guide_quote(hours: float, group_size: int, *, actual: bool,
                 elapsed_minutes: int | None = None) -> Quote:
    total = GUIDE_HOURLY_JOD * hours
    if actual:
        label_en = f"{hours:g} h guiding at {GUIDE_HOURLY_JOD:.0f} JOD/h (actual)"
        label_ar = f"{hours:g} ساعة إرشاد × {GUIDE_HOURLY_JOD:.0f} دينار (فعلي)"
    else:
        label_en = f"{hours:g} h guiding at {GUIDE_HOURLY_JOD:.0f} JOD/h (estimated)"
        label_ar = f"{hours:g} ساعة إرشاد × {GUIDE_HOURLY_JOD:.0f} دينار (تقديري)"

    return Quote(
        total_jod=round(total, 2),
        hours=max(1, round(hours)),
        group_size=group_size,
        breakdown=[PriceLine(label_en=label_en, label_ar=label_ar,
                             amount_jod=round(total, 2))],
        hourly_rate_jod=GUIDE_HOURLY_JOD,
        is_estimate=not actual,
        elapsed_minutes=elapsed_minutes,
        is_mock=False,  # the guide rate is a real agreed number, not a placeholder
    )


def quote(provider: Provider, hours: int = 4, group_size: int = 2) -> Quote:
    """What the trip is expected to cost, from the planned timeline."""
    hours = max(1, hours)
    group_size = max(1, group_size)

    if is_guide(provider):
        return _guide_quote(hours, group_size, actual=False)

    base = BASE_FEE_JOD.get(role_of(provider), 0.0)
    hourly = provider.hourly_rate_jod or DEFAULT_HOURLY_JOD
    time_cost = hourly * hours
    extra_people = max(0, group_size - LARGE_GROUP_THRESHOLD)
    group_cost = PER_EXTRA_PERSON_JOD * extra_people

    lines = [
        PriceLine(label_en="Call-out fee", label_ar="رسوم الحضور",
                  amount_jod=round(base, 2)),
        PriceLine(label_en=f"{hours} hours x {hourly:.0f} JOD",
                  label_ar=f"{hours} ساعات × {hourly:.0f} دينار",
                  amount_jod=round(time_cost, 2)),
    ]
    if group_cost:
        lines.append(PriceLine(
            label_en=f"Large group (+{extra_people} people)",
            label_ar=f"مجموعة كبيرة (+{extra_people} أشخاص)",
            amount_jod=round(group_cost, 2),
        ))

    return Quote(
        total_jod=round(base + time_cost + group_cost, 2),
        hours=hours,
        group_size=group_size,
        breakdown=lines,
        hourly_rate_jod=hourly,
        is_estimate=True,
        is_mock=True,
    )


def settle(provider: Provider, elapsed_minutes: int, group_size: int = 2) -> Quote:
    """What the trip actually cost, from the time it really ran."""
    minutes = billable_minutes(elapsed_minutes)
    hours = minutes / 60

    if is_guide(provider):
        return _guide_quote(hours, max(1, group_size), actual=True,
                            elapsed_minutes=int(elapsed_minutes))

    # Non-guide roles bill their estimate formula against the measured hours.
    settled = quote(provider, hours=max(1, round(hours)), group_size=group_size)
    settled.is_estimate = False
    settled.elapsed_minutes = int(elapsed_minutes)
    return settled
