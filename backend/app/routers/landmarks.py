from fastapi import APIRouter

from app.data.landmarks import LANDMARKS
from app.models import Landmark

router = APIRouter(prefix="/landmarks", tags=["landmarks"])


@router.get("", response_model=list[Landmark])
def list_landmarks() -> list[Landmark]:
    return list(LANDMARKS.values())
