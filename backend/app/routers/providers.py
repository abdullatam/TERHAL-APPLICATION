from fastapi import APIRouter, HTTPException

from app.models import Provider, ProviderRegistration, SiteId
from app.store import store

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("", response_model=list[Provider])
def list_providers(site: SiteId | None = None) -> list[Provider]:
    providers = list(store.providers.values())
    if site:
        providers = [p for p in providers if site in p.sites]
    return providers


@router.post("/register", response_model=Provider)
def register_provider(payload: ProviderRegistration) -> Provider:
    provider = Provider(
        id=store.new_id("prov"),
        name=payload.name,
        role=payload.role,
        sites=payload.sites,
        languages=payload.languages,
        verified=False,  # pending admin verification, per Section 2.3.D
    )
    store.providers[provider.id] = provider
    return provider


@router.get("/{provider_id}", response_model=Provider)
def get_provider(provider_id: str) -> Provider:
    provider = store.providers.get(provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    return provider
