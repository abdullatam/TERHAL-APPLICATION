from fastapi import APIRouter

from app.data.sites import SITES
from app.models import Site

router = APIRouter(prefix="/sites", tags=["sites"])


@router.get("", response_model=list[Site])
def list_sites() -> list[Site]:
    return list(SITES.values())
