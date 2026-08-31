from fastapi import APIRouter

from app.data.landmarks import LANDMARKS
from app.models import Landmark, SiteId

router = APIRouter(prefix="/landmarks", tags=["landmarks"])


@router.get("", response_model=list[Landmark])
def list_landmarks(site: SiteId | None = None) -> list[Landmark]:
    landmarks = list(LANDMARKS.values())
    if site:
        landmarks = [l for l in landmarks if l.site == site]
    return landmarks
