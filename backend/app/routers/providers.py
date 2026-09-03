from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.db_models import ProviderORM
from app.models import Provider, ProviderWithDistance
from app.services.geo import haversine_km
from app.services.pricing_service import quote

router = APIRouter(prefix="/providers", tags=["providers"])


def _parse_near(near: str | None) -> tuple[float, float] | None:
    if not near:
        return None
    try:
        lat, lon = (float(part) for part in near.split(",", 1))
        return lat, lon
    except ValueError:
        raise HTTPException(status_code=400, detail="near must be 'lat,lon'")


@router.get("", response_model=list[ProviderWithDistance])
def list_providers(
    near: str | None = Query(None, description="'lat,lon' of the tourist"),
    role: str | None = None,
    language: str | None = None,
    landmark_id: str | None = None,
    verified_only: bool = False,
    welfare_compliant_only: bool = False,
    hours: int = 4,
    group_size: int = 2,
    db: Session = Depends(get_db),
) -> list[ProviderWithDistance]:
    """Advisors for the finder map, each already carrying the price this exact
    trip would cost — so the tourist compares real totals, not hourly rates."""
    query = select(ProviderORM)
    if role:
        query = query.where(ProviderORM.role == role)
    if verified_only:
        query = query.where(ProviderORM.verified.is_(True))
    if welfare_compliant_only:
        query = query.where(ProviderORM.welfare_compliant.is_(True))

    providers = list(db.scalars(query).all())
    if language:
        providers = [p for p in providers if language in (p.languages or [])]
    if landmark_id:
        providers = [p for p in providers if landmark_id in (p.landmark_ids or [])]

    origin = _parse_near(near)
    results: list[ProviderWithDistance] = []
    for row in providers:
        model = ProviderWithDistance.model_validate(row, from_attributes=True)
        if origin and row.lat is not None and row.lon is not None:
            model.distance_km = round(haversine_km(origin, (row.lat, row.lon)), 1)
        model.quote = quote(model, hours=hours, group_size=group_size)
        results.append(model)

    # Nearest first when we know where the tourist is; otherwise best-rated.
    if origin:
        results.sort(key=lambda p: (p.distance_km is None, p.distance_km or 0))
    else:
        results.sort(key=lambda p: -p.rating)
    return results


@router.get("/{provider_id}", response_model=ProviderWithDistance)
def get_provider(
    provider_id: str,
    hours: int = 4,
    group_size: int = 2,
    db: Session = Depends(get_db),
) -> ProviderWithDistance:
    row = db.get(ProviderORM, provider_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Provider not found")
    model = ProviderWithDistance.model_validate(row, from_attributes=True)
    model.quote = quote(model, hours=hours, group_size=group_size)
    return model
