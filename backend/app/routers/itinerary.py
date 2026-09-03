from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Itinerary, ItineraryRequest
from app.services.itinerary_service import generate_from_selection, load_itinerary

router = APIRouter(prefix="/itinerary", tags=["itinerary"])


@router.post("/from-selection", response_model=Itinerary)
def create_from_selection(
    req: ItineraryRequest, db: Session = Depends(get_db)
) -> Itinerary:
    """Takes the ids swiped right on and returns a packed day-by-day timeline."""
    itinerary = generate_from_selection(db, req)
    if not itinerary.days:
        raise HTTPException(
            status_code=422,
            detail="None of the selected places could be scheduled — try more days "
                   "or fewer accessibility restrictions",
        )
    return itinerary


@router.get("/{itinerary_id}", response_model=Itinerary)
def get_itinerary(itinerary_id: str, db: Session = Depends(get_db)) -> Itinerary:
    itinerary = load_itinerary(db, itinerary_id)
    if itinerary is None:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    return itinerary
