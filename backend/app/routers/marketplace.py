"""Marketplace — real vendor rows, and an honest gap where products should be.

Vendors already exist in the providers table as `role="vendor"`, with real
names, ratings, verification and landmark coverage. This endpoint returns them
as "makers", resolving their `landmark_ids` to place names so the UI can say
where someone works.

TODO(backend, needs a product owner decision): vendors currently have nothing
to sell. Screen 06 of the design shows priced items — "Layered sand bottle,
JOD 12", "Bedouin floor rug, JOD 68" — which no table models. Implementing
that needs a decision this task cannot make alone, because it changes what a
vendor *is*: today they are booked like a guide, and selling goods implies
stock, fulfilment and a cart.

The shape needed, when someone owns it:

    market_items
      id            str   PK
      provider_id   str   FK -> providers.id
      title_en      str
      title_ar      str
      price_jod     float
      image_url     str | None   (same free-licence rule as landmark images)
      in_stock      bool

Until then `items` is an empty list and `items_pending` is true, so the UI
states the catalogue is coming rather than rendering invented stock that would
read as real.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.db_models import LandmarkORM, ProviderORM
from app.models import Maker, Marketplace, ProviderRole

router = APIRouter(prefix="/marketplace", tags=["marketplace"])

# Roles that make or sell something, as opposed to guiding or driving.
MAKER_ROLES = (ProviderRole.vendor.value,)


@router.get("", response_model=Marketplace)
def list_makers(
    q: str | None = Query(default=None, description="free-text name filter"),
    db: Session = Depends(get_db),
) -> Marketplace:
    stmt = select(ProviderORM).where(ProviderORM.role.in_(MAKER_ROLES))
    if q:
        stmt = stmt.where(ProviderORM.name.ilike(f"%{q}%"))
    rows = db.scalars(stmt.order_by(ProviderORM.rating.desc())).all()

    # Resolve coverage to place names in one pass rather than per maker.
    wanted = {lid for row in rows for lid in (row.landmark_ids or [])}
    places: dict[str, LandmarkORM] = {}
    if wanted:
        places = {
            l.id: l
            for l in db.scalars(
                select(LandmarkORM).where(LandmarkORM.id.in_(wanted))
            ).all()
        }

    makers: list[Maker] = []
    for row in rows:
        covered = [places[lid] for lid in (row.landmark_ids or []) if lid in places]
        makers.append(
            Maker(
                id=row.id,
                name=row.name,
                role=row.role,
                rating=row.rating,
                verified=row.verified,
                bio_en=row.bio_en,
                bio_ar=row.bio_ar,
                photo_url=row.photo_url,
                based_at_en=covered[0].name_en if covered else None,
                based_at_ar=covered[0].name_ar if covered else None,
                items=[],  # see the module docstring
            )
        )

    return Marketplace(makers=makers, items_pending=True)
